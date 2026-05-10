// ============================================================
// AIS DATA MODULE — with message deduplication, caching & rate-limiting
// ============================================================

import { store } from '@/store';
import type { LiveVessel } from '@/types/live-vessel';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ── In-memory vessel cache ───────────────────────────────────────────────────
// Source of truth for all live vessels. Pages read from this directly via
// store.getState().liveFleet which is flushed here every FLUSH_INTERVAL_MS.
export const liveShipsMap = new Map<number, LiveVessel>();

// Track history: circular buffer of last 50 [lat, lng] per MMSI
export const vesselTrackHistory = new Map<number, [number, number][]>();
const TRACK_HISTORY_MAX = 50;

// ── Rate-limiting config ─────────────────────────────────────────────────────
// Min milliseconds between position updates for the SAME vessel
// Prevents one highly active vessel from starving others
const MIN_UPDATE_INTERVAL_MS = 500;
const lastUpdateTime = new Map<number, number>(); // mmsi → timestamp

// How often we flush the full vessel map into the store (ms)
const FLUSH_INTERVAL_MS = 2000;

// ── Parsed message counter for diagnostics ───────────────────────────────────
let messagesReceived = 0;
let messagesDropped  = 0;

export function getAisStats() {
  return { messagesReceived, messagesDropped, vesselCount: liveShipsMap.size };
}

// ── Init ─────────────────────────────────────────────────────────────────────
export function initAIS(): void {
  connect();

  // Flush vessel array to store at fixed interval — decouples AIS ingest rate
  // from UI render rate. Store's rAF batching further coalesces these flushes.
  setInterval(flushToStore, FLUSH_INTERVAL_MS);

  // Anomaly detection runs every 60s — low frequency, no performance impact
  setInterval(runAnomalyDetection, 60_000);
}

// ── Store flush ───────────────────────────────────────────────────────────────
function flushToStore(): void {
  if (liveShipsMap.size === 0) return;
  // Use the fast path that skips deepMerge
  store.setLiveFleet(Array.from(liveShipsMap.values()));
}

// ── WebSocket connection ──────────────────────────────────────────────────────
function connect(): void {
  if (socket) { try { socket.close(); } catch (_) {} }
  socket = new WebSocket('ws://localhost:8080');

  socket.onopen = () => {
    store.setState({ aisStatus: 'connected' });
    const apiKey = store.getState().settings.apiKeys?.aisstream;
    if (apiKey) {
      socket?.send(JSON.stringify({ _type: 'subscribe', apiKey }));
    }
  };

  socket.onmessage = (event) => {
    messagesReceived++;
    try {
      const data = JSON.parse(event.data as string);

      // ── Status messages from proxy ──────────────────────────────────────
      if (data._type === 'status') {
        store.setState({ aisStatus: data.status === 'connected' ? 'live' : data.status });
        return;
      }

      if (data.MessageType !== 'PositionReport' && data.MessageType !== 'ShipStaticData') return;

      const mmsi: number = data.MetaData?.MMSI;
      if (!mmsi) return;

      // ── Per-MMSI rate limiting ────────────────────────────────────────────
      // PositionReports arrive very frequently for the same vessel.
      // Only process if enough time has passed since last update for this MMSI.
      if (data.MessageType === 'PositionReport') {
        const last = lastUpdateTime.get(mmsi) ?? 0;
        const now  = Date.now();
        if (now - last < MIN_UPDATE_INTERVAL_MS) {
          messagesDropped++;
          return; // skip — vessel updated too recently
        }
        lastUpdateTime.set(mmsi, now);
      }

      // ── Merge into cache ──────────────────────────────────────────────────
      const existing: LiveVessel = liveShipsMap.get(mmsi) ?? ({
        mmsi,
        name: data.MetaData?.ShipName?.trim() || 'Unknown Vessel',
      } as LiveVessel);

      if (data.MessageType === 'PositionReport') {
        const lat: number = data.Message.PositionReport.Latitude;
        const lng: number = data.Message.PositionReport.Longitude;

        // Guard: skip invalid coordinates (0,0 is a common AIS artifact)
        if (!lat || !lng || (lat === 0 && lng === 0)) return;

        // Track history circular buffer
        const history = vesselTrackHistory.get(mmsi) ?? [];
        history.push([lat, lng]);
        if (history.length > TRACK_HISTORY_MAX) history.shift();
        vesselTrackHistory.set(mmsi, history);

        existing.lat       = lat;
        existing.lng       = lng;
        existing.cog       = data.Message.PositionReport.Cog;
        existing.sog       = data.Message.PositionReport.Sog;
        existing.heading   = data.Message.PositionReport.TrueHeading;
        existing.navStatus = data.Message.PositionReport.NavigationalStatus;
        existing.updated   = new Date();

      } else if (data.MessageType === 'ShipStaticData') {
        // Static data arrives much less frequently — no rate limiting needed
        const sd = data.Message.ShipStaticData;
        existing.name        = sd.Name?.trim()        || existing.name;
        existing.type        = sd.Type;
        existing.destination = sd.Destination?.trim() || existing.destination;
        existing.callsign    = sd.CallSign?.trim();
        existing.imo         = sd.ImoNumber;
        existing.dim         = sd.Dimension;
        existing.eta         = sd.Eta;
      }

      liveShipsMap.set(mmsi, existing);

    } catch (_) { /* silently ignore malformed messages */ }
  };

  socket.onerror = () => {
    // Don't log errors repeatedly — the onclose handler will reconnect
    store.setState({ aisStatus: 'error' });
  };

  socket.onclose = () => {
    store.setState({ aisStatus: 'disconnected' });
    if (reconnectTimer) clearTimeout(reconnectTimer);
    // Exponential-ish backoff: try again in 5s
    reconnectTimer = setTimeout(connect, 5000);
  };
}

// ── Rule-based anomaly detection ─────────────────────────────────────────────
// Runs every 60s. Works directly off liveShipsMap (not store) to avoid
// triggering a flush/re-render just for the detection pass.
function runAnomalyDetection(): void {
  if (liveShipsMap.size === 0) return;

  const state  = store.getState();
  const now    = Date.now();
  const newAlerts: typeof state.alerts = [];

  // Deduplicate: collect MMSIs that already have an active anomaly alert
  const existingAnomalyMMSIs = new Set(
    state.alerts
      .filter(a => a.id.startsWith('ANO-'))
      .map(a => parseInt(a.id.split('-')[2] ?? '0'))
  );

  liveShipsMap.forEach(ship => {
    if (existingAnomalyMMSIs.has(ship.mmsi)) return; // don't spam duplicate alerts

    // Rule 1: Under way but near-zero speed → adrift
    if (ship.navStatus === 0 && ship.sog !== undefined && ship.sog < 0.5) {
      newAlerts.push({
        id: `ANO-ADRIFT-${ship.mmsi}-${now}`,
        shipmentId: null,
        type:      'delay_detected' as const,
        severity:  'warning' as const,
        title:     'Vessel Adrift',
        message:   `${ship.name} (MMSI ${ship.mmsi}) is under way but has near-zero speed (${ship.sog?.toFixed(1)} kn).`,
        timestamp: new Date().toISOString(),
        read:          false,
        acknowledged:  false,
      });
    }

    // Rule 2: Unusually high speed > 25 kn (filter obvious bad data > 100)
    if (ship.sog !== undefined && ship.sog > 25 && ship.sog < 100) {
      newAlerts.push({
        id: `ANO-FAST-${ship.mmsi}-${now}`,
        shipmentId: null,
        type:      'delay_detected' as const,
        severity:  'warning' as const,
        title:     'Unusually High Speed',
        message:   `${ship.name} (MMSI ${ship.mmsi}) travelling at ${ship.sog.toFixed(1)} kn — above normal vessel speeds.`,
        timestamp: new Date().toISOString(),
        read:          false,
        acknowledged:  false,
      });
    }

    // Rule 3: Signal lost — no update > 10 minutes
    if (ship.updated) {
      const ageMins = (now - new Date(ship.updated).getTime()) / 60000;
      if (ageMins > 10) {
        newAlerts.push({
          id: `ANO-LOST-${ship.mmsi}-${now}`,
          shipmentId: null,
          type:      'delay_detected' as const,
          severity:  'critical' as const,
          title:     'AIS Signal Lost',
          message:   `${ship.name} (MMSI ${ship.mmsi}) — no position update for ${Math.round(ageMins)} minutes.`,
          timestamp: new Date().toISOString(),
          read:          false,
          acknowledged:  false,
        });
      }
    }
  });

  if (newAlerts.length > 0) {
    const combined = [...newAlerts, ...state.alerts].slice(0, 200);
    store.setState({ alerts: combined });
  }
}
