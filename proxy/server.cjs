// ============================================================
// AIS PROXY SERVER — with server-side rate limiting & backpressure
// Bridges browser ↔ AISStream.io (required: browser CORS blocked)
// Usage: node proxy/server.cjs  OR  npm run proxy
// Set env var: AISSTREAM_API_KEY=your_key_here
// ============================================================

const WebSocket = require('ws');

const PORT = 8080;
const AIS_URL = 'wss://stream.aisstream.io/v0/stream';

// ── Server-side per-MMSI throttle ────────────────────────────────────────────
// Even if AISStream sends 10 messages/sec for the same vessel,
// the proxy only forwards one every THROTTLE_MS milliseconds.
const THROTTLE_MS = 1000; // 1 update per vessel per second max
const lastSentTime = new Map(); // mmsi → timestamp

// ── Message queue with backpressure ──────────────────────────────────────────
// If the browser client is slow (bufferedAmount high), we pause forwarding
// rather than filling a massive queue that causes memory bloat.
const MAX_BUFFERED_BYTES = 256 * 1024; // 256 KB

// ── Stats ─────────────────────────────────────────────────────────────────────
let totalReceived = 0;
let totalForwarded = 0;
let totalThrottled = 0;

// Bounding boxes: major global shipping lanes
const DEFAULT_BBOXES = [
  // North Atlantic (Europe ↔ Americas)
  [[30.0, -80.0], [65.0, 10.0]],
  // North Pacific (Asia ↔ Americas)
  [[20.0, 120.0], [60.0, -120.0]],
  // Indian Ocean / Suez / Malacca Strait
  [[-10.0, 30.0], [30.0, 120.0]],
  // Mediterranean + Black Sea
  [[30.0, -5.0], [47.0, 42.0]],
];

const wss = new WebSocket.Server({ port: PORT });
console.log(`[AIS Proxy] Listening on ws://localhost:${PORT}`);
console.log(`[AIS Proxy] Per-vessel throttle: ${THROTTLE_MS}ms`);

// Print throughput stats every 30 seconds
setInterval(() => {
  const rate = totalForwarded;
  const drop = totalThrottled;
  console.log(`[AIS Proxy] Stats: received=${totalReceived} forwarded=${totalForwarded} throttled=${totalThrottled} vessels_cached=${lastSentTime.size} drop_rate=${totalReceived > 0 ? Math.round((drop/totalReceived)*100) : 0}%`);
  totalReceived = 0;
  totalForwarded = 0;
  totalThrottled = 0;
}, 30_000);

wss.on('connection', (clientWs) => {
  console.log('[AIS Proxy] Browser client connected');

  // Per-client throttle map (so multiple browser tabs don't share state)
  const clientLastSent = new Map();

  let apiKey = process.env.AISSTREAM_API_KEY || '';
  let aisWs = null;
  let reconnectDelay = 3000;

  function connectToAIS(key, bboxes) {
    if (aisWs) {
      try { aisWs.close(); } catch (_) {}
    }

    aisWs = new WebSocket(AIS_URL);

    aisWs.on('open', () => {
      console.log('[AIS Proxy] Connected to AISStream.io');
      reconnectDelay = 3000; // reset backoff on successful connection
      const sub = {
        APIKey: key,
        BoundingBoxes: bboxes || DEFAULT_BBOXES,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      aisWs.send(JSON.stringify(sub));
      clientWs.send(JSON.stringify({ _type: 'status', status: 'connected', source: 'aisstream' }));
    });

    aisWs.on('message', (data) => {
      totalReceived++;

      // Backpressure: don't forward if client socket buffer is full
      if (clientWs.readyState !== WebSocket.OPEN) return;
      if (clientWs.bufferedAmount > MAX_BUFFERED_BYTES) {
        totalThrottled++;
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch (_) {
        return; // skip malformed
      }

      // Always forward status messages immediately
      if (parsed._type === 'status') {
        clientWs.send(data.toString());
        totalForwarded++;
        return;
      }

      // ── Per-MMSI throttle for PositionReports ─────────────────────────────
      if (parsed.MessageType === 'PositionReport') {
        const mmsi = parsed.MetaData?.MMSI;
        if (!mmsi) return;

        const now  = Date.now();
        const last = clientLastSent.get(mmsi) ?? 0;
        if (now - last < THROTTLE_MS) {
          totalThrottled++;
          return; // drop — too soon for this vessel
        }
        clientLastSent.set(mmsi, now);
      }

      // ── Guard: skip obviously invalid coordinates ─────────────────────────
      if (parsed.MessageType === 'PositionReport') {
        const lat = parsed.Message?.PositionReport?.Latitude;
        const lng = parsed.Message?.PositionReport?.Longitude;
        if (!lat || !lng || (lat === 0 && lng === 0)) {
          totalThrottled++;
          return;
        }
      }

      clientWs.send(data.toString());
      totalForwarded++;
    });

    aisWs.on('error', (err) => {
      console.error('[AIS Proxy] AISStream error:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ _type: 'status', status: 'error', message: err.message }));
      }
    });

    aisWs.on('close', (code) => {
      console.log(`[AIS Proxy] AISStream closed (code: ${code})`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ _type: 'status', status: 'disconnected' }));
      }
      // Reconnect with exponential backoff (max 30s)
      if (apiKey) {
        const delay = Math.min(reconnectDelay, 30_000);
        console.log(`[AIS Proxy] Reconnecting in ${delay}ms...`);
        setTimeout(() => connectToAIS(apiKey, bboxes), delay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30_000);
      }
    });
  }

  // Auto-connect if API key provided via env var
  if (apiKey) {
    connectToAIS(apiKey, DEFAULT_BBOXES);
  } else {
    clientWs.send(JSON.stringify({
      _type: 'status',
      status: 'awaiting_key',
      message: 'Set your AISStream API key in Settings → API Keys',
    }));
  }

  // Commands from browser (set API key, update bounding boxes)
  clientWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg._type === 'subscribe' && msg.apiKey) {
        console.log('[AIS Proxy] Received API key from browser, connecting...');
        apiKey = msg.apiKey;
        clientLastSent.clear(); // reset throttle map on new subscription
        connectToAIS(apiKey, msg.bboxes || DEFAULT_BBOXES);
      }
    } catch (e) {
      console.error('[AIS Proxy] Invalid message from browser:', e.message);
    }
  });

  clientWs.on('close', () => {
    console.log('[AIS Proxy] Browser client disconnected');
    clientLastSent.clear();
    if (aisWs) { try { aisWs.close(); } catch (_) {} }
  });

  clientWs.on('error', (err) => {
    console.error('[AIS Proxy] Client WebSocket error:', err.message);
  });
});

// Heartbeat to detect stale connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30_000);

process.on('uncaughtException', (err) => {
  console.error('[AIS Proxy] Uncaught exception:', err.message);
  // Don't crash the proxy on individual message errors
});
