// ============================================================
// LIVE TRACKING PAGE
// ============================================================

import { store } from '@/store';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { vesselTrackHistory } from '@/data/ais';
import { cachedShipTypeInfo, cachedDimensions, throttle } from '@/utils/cache';

let mapInstance: L.Map | null = null;
let markerClusterGroup: L.MarkerClusterGroup | null = null;
let heatLayer: L.HeatLayer | null = null;
const liveMarkers: Map<number, L.Marker> = new Map();
const trackPolylines: Map<number, L.Polyline[]> = new Map();
let unsubscribe: (() => void) | null = null;
let heatmapMode = false;

export function unmountTracking(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Pinned vessels persisted in localStorage
function getPinnedMMSIs(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem('pinnedVessels') || '[]')); }
  catch { return new Set(); }
}
function savePinnedMMSIs(set: Set<number>): void {
  localStorage.setItem('pinnedVessels', JSON.stringify([...set]));
}
function togglePin(mmsi: number): void {
  const pins = getPinnedMMSIs();
  if (pins.has(mmsi)) pins.delete(mmsi); else pins.add(mmsi);
  savePinnedMMSIs(pins);
}

export function renderTracking(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-enter" style="display:flex;flex-direction:column;height:calc(100vh - var(--topbar-height) - var(--space-5)*2)">
      <div class="page-header" style="margin-bottom:var(--space-4)">
        <div>
          <h2 class="page-heading">Live Tracking</h2>
          <p class="page-subheading" style="display:flex;align-items:center;gap:var(--space-2)">
            Real-time vessel positions
            <span id="ais-status" class="badge badge-neutral" style="font-size:10px">Connecting to Proxy...</span>
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="fullscreen-map-btn" title="Fullscreen Map">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            Fullscreen
          </button>
          <button class="btn btn-secondary btn-sm" id="track-history-toggle" title="Toggle Track Trails" style="opacity:1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Trails
          </button>
          <button class="btn btn-secondary btn-sm" id="heatmap-toggle" title="Toggle Shipping Lane Heatmap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Heatmap
          </button>
        </div>
      </div>

      <div style="display:flex;gap:var(--space-4);flex:1;min-height:0">
        <!-- Map -->
        <div style="flex:1;min-width:0;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border)" id="map-container">
          <div id="map" style="width:100%;height:100%"></div>
        </div>

        <!-- Sidebar panel -->
        <div style="width:280px;flex-shrink:0;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);display:flex;flex-direction:column;overflow:hidden">
          <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border)">
            <input type="text" id="track-search" placeholder="Search vesselsâ€¦" style="width:100%" />
          </div>
          <div id="track-list" style="flex:1;overflow-y:auto;padding:var(--space-2)"></div>
        </div>
      </div>

      <!-- Legend -->
      <div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);flex-wrap:wrap">
        ${[
      { l: 'Cargo', c: '#10b981' },
      { l: 'Tanker', c: '#ef4444' },
      { l: 'Passenger', c: '#3b82f6' },
      { l: 'Fishing', c: '#f59e0b' },
      { l: 'High Speed', c: '#8b5cf6' },
      { l: 'Other Live', c: '#94a3b8' }
    ].map(({ l, c }) => `
          <div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);color:var(--text-muted)">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2L4 10v10a2 2 0 002 2h12a2 2 0 002-2V10L12 2z" fill="${c}" stroke="#000" stroke-width="1.5"/></svg>
            ${l}
          </div>
        `).join('')}
        <div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-xs);color:var(--text-muted)">
          <div style="width:24px;height:3px;background:linear-gradient(90deg,transparent,#60a5fa)"></div>
          Track Trail
        </div>
      </div>
    </div>
  `;

  // Fullscreen map toggle
  document.getElementById('fullscreen-map-btn')?.addEventListener('click', () => {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // Track history toggle
  let trailsEnabled = true;
  document.getElementById('track-history-toggle')?.addEventListener('click', () => {
    trailsEnabled = !trailsEnabled;
    const btn = document.getElementById('track-history-toggle');
    if (btn) btn.style.opacity = trailsEnabled ? '1' : '0.4';
    if (!trailsEnabled) {
      // Clear all polylines from map
      trackPolylines.forEach(lines => lines.forEach(l => mapInstance?.removeLayer(l)));
      trackPolylines.clear();
    }
  });

  // Heatmap toggle
  document.getElementById('heatmap-toggle')?.addEventListener('click', () => {
    heatmapMode = !heatmapMode;
    const btn = document.getElementById('heatmap-toggle');
    if (btn) btn.classList.toggle('btn-primary', heatmapMode);
    
    if (heatmapMode) {
      // Create heat layer and add it
      const points = store.getState().liveFleet.map((s: any) => [s.lat, s.lng, 1] as L.HeatLatLngTuple);
      if (mapInstance && !heatLayer) {
        heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 10 }).addTo(mapInstance);
      } else if (heatLayer) {
        heatLayer.setLatLngs(points);
      }
      
      // Hide clusters/markers
      if (markerClusterGroup && mapInstance) mapInstance.removeLayer(markerClusterGroup);
      trackPolylines.forEach(lines => lines.forEach(l => mapInstance?.removeLayer(l)));
    } else {
      // Remove heatmap
      if (heatLayer && mapInstance) {
        mapInstance.removeLayer(heatLayer);
        heatLayer = null;
      }
      // Restore clusters
      if (markerClusterGroup && mapInstance) mapInstance.addLayer(markerClusterGroup);
      if (unsubscribe) unsubscribe();
      const tu = throttle((state: any) => updateFromStore(state, trailsEnabled), 500);
      unsubscribe = store.subscribe(tu);
      tu(store.getState());
    }
  });

  setTimeout(() => {
    initMap();
    if (unsubscribe) unsubscribe();
    // Throttle: tracking page re-renders at most every 500ms regardless of store update rate
    const throttledUpdate = throttle((state: any) => updateFromStore(state, trailsEnabled), 500);
    unsubscribe = store.subscribe(throttledUpdate);
    throttledUpdate(store.getState());

    document.getElementById('track-history-toggle')?.addEventListener('click', () => {
      if (unsubscribe) unsubscribe();
      const tu = throttle((state: any) => updateFromStore(state, trailsEnabled), 500);
      unsubscribe = store.subscribe(tu);
    });
  }, 100);
}

function updateAisStatus(status: string): void {
  const el = document.getElementById('ais-status');
  if (el) {
    el.className = `badge ${status === 'live' ? 'badge-green' : 'badge-neutral'}`;
    el.textContent = status === 'live' ? 'Live AIS Connected' : status;
  }
}

function updateFromStore(state: any, trailsEnabled: boolean): void {
  updateAisStatus(state.aisStatus);
  if (!mapInstance) return;

  const fleet = state.liveFleet || [];
  
  if (heatmapMode && heatLayer) {
    const points = fleet.map((s: any) => [s.lat, s.lng, 1] as L.HeatLatLngTuple);
    heatLayer.setLatLngs(points);
    renderTrackList(fleet);
    return; // Don't render individual markers/trails
  }

  fleet.forEach((ship: any) => {
    updateLiveMarker(ship);
    if (trailsEnabled) updateTrackPolyline(ship);
  });

  renderTrackList(fleet);
}

// â”€â”€ Vessel track history polyline rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateTrackPolyline(ship: any): void {
  if (!mapInstance) return;
  const history = vesselTrackHistory.get(ship.mmsi);
  if (!history || history.length < 2) return;

  const existing = trackPolylines.get(ship.mmsi);
  if (existing) existing.forEach(l => mapInstance?.removeLayer(l));

  const typeInfo = cachedShipTypeInfo(ship.type);
  const segments: L.Polyline[] = [];

  // Draw segmented trail â€” each segment fades out from the oldest position
  for (let i = 1; i < history.length; i++) {
    const opacity = (i / history.length) * 0.75;  // oldest = transparent, newest = solid
    const weight  = 1 + (i / history.length) * 2; // oldest thin, newest thick
    const line = L.polyline([history[i - 1], history[i]], {
      color: typeInfo.color,
      opacity,
      weight,
      smoothFactor: 1,
    }).addTo(mapInstance!);
    segments.push(line);
  }

  trackPolylines.set(ship.mmsi, segments);
}

function updateLiveMarker(ship: any): void {
  if (!mapInstance || !ship.lat || !ship.lng) return;

  const typeInfo = cachedShipTypeInfo(ship.type);
  const rotation = ship.cog || ship.heading || 0;
  const speed = ship.sog !== undefined ? ship.sog.toFixed(1) : '--';
  const cog = ship.cog !== undefined ? ship.cog.toFixed(1) : '--';
  const heading = ship.heading && ship.heading !== 511 ? ship.heading + '°' : '--';
  const dims = cachedDimensions(ship.mmsi, ship.dim);
  const pins = getPinnedMMSIs();
  const isPinned = pins.has(ship.mmsi);

  const svgIcon = `
    <div style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5))">
      ${isPinned ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:10px">ðŸ“Œ</div>` : ''}
      <svg viewBox="0 0 24 24" style="transform: rotate(${rotation}deg); width: 16px; height: 16px;">
        <path d="M12 2L4 10v10a2 2 0 002 2h12a2 2 0 002-2V10L12 2z" fill="${typeInfo.color}" stroke="rgba(0,0,0,0.8)" stroke-width="1.5"/>
      </svg>
    </div>
  `;

  let marker = liveMarkers.get(ship.mmsi);

  if (!marker) {
    const icon = L.divIcon({ html: svgIcon, className: '', iconSize: [20, 24], iconAnchor: [10, 12] });
    marker = L.marker([ship.lat, ship.lng], { icon });
    if (markerClusterGroup) {
      markerClusterGroup.addLayer(marker);
    } else {
      marker.addTo(mapInstance);
    }
    liveMarkers.set(ship.mmsi, marker);
  } else {
    // For performance, just update the LatLng directly rather than removing/re-adding from cluster.
    // Call refreshClusters if we need to update the cluster bounds.
    marker.setLatLng([ship.lat, ship.lng]);
    marker.setIcon(L.divIcon({ html: svgIcon, className: '', iconSize: [20, 24], iconAnchor: [10, 12] }));
    // Ideally we'd call markerClusterGroup?.refreshClusters(marker) here if we wanted strictly correct clustering,
    // but this is extremely expensive to do 100 times per second. Leaflet.markercluster handles setLatLng reasonably well.
  }

  marker.bindPopup(`
    <div style="font-family:Inter,sans-serif;min-width:280px;padding:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--text-primary);line-height:1.2;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ship.name}">${ship.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:2px">
            MMSI: ${ship.mmsi} ${ship.imo ? `Â· IMO: ${ship.imo}` : ''} ${ship.callsign ? `Â· ${ship.callsign}` : ''}
          </div>
        </div>
        <div class="badge badge-neutral" style="font-size:10px;background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${typeInfo.label}</div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;margin-top:12px">
        <div style="background:var(--bg-elevated);padding:8px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">SPEED (SOG)</div>
          <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${speed} kn</div>
        </div>
        <div style="background:var(--bg-elevated);padding:8px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">COURSE (COG)</div>
          <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${cog}Â°</div>
        </div>
        <div style="background:var(--bg-elevated);padding:8px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">HEADING</div>
          <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${heading}</div>
        </div>
        <div style="background:var(--bg-elevated);padding:8px;border-radius:6px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">DIMENSIONS</div>
          <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${dims}</div>
        </div>
      </div>
      
      ${ship.destination ? `
        <div style="font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;margin-bottom:8px;background:var(--bg-elevated);padding:8px;border-radius:4px;border:1px solid var(--border)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <div>
            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">Destination</div>
            <div style="font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ship.destination}</div>
          </div>
        </div>
      ` : ''}
      
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-muted);margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 4px var(--accent-green)"></div>
          Live AIS Â· ${ship.updated?.toLocaleTimeString() ?? 'just now'}
        </div>
        <button onclick="window.__pinVessel(${ship.mmsi})" style="background:none;border:none;cursor:pointer;color:${isPinned ? '#f59e0b' : 'var(--text-muted)'};font-size:16px;padding:0;line-height:1;" title="${isPinned ? 'Unpin vessel' : 'Pin vessel'}">
          ${isPinned ? 'ðŸ“Œ' : 'ðŸ“'}
        </button>
      </div>
    </div>
  `);
}

// Expose pin toggle for popup button
(window as any).__pinVessel = (mmsi: number) => {
  togglePin(mmsi);
  // Re-render marker to update pin icon
  const state = store.getState();
  const ship = state.liveFleet?.find((s: any) => s.mmsi === mmsi);
  if (ship) updateLiveMarker(ship);
  renderTrackList(state.liveFleet || []);
};

function initMap(): void {
  if (mapInstance) {
    if (markerClusterGroup) {
      mapInstance.removeLayer(markerClusterGroup);
    }
    mapInstance.remove();
    mapInstance = null;
    markerClusterGroup = null;
    liveMarkers.clear();
    trackPolylines.clear();
  }

  const state = store.getState();
  const isDark = state.theme === 'dark';

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  mapInstance = L.map('map', { zoomControl: true, attributionControl: false }).setView([30, -40], 3);
  L.tileLayer(tileUrl, { maxZoom: 18, subdomains: 'abcd' }).addTo(mapInstance);

  markerClusterGroup = L.markerClusterGroup({
    disableClusteringAtZoom: 12,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    chunkedLoading: true,
  });
  mapInstance.addLayer(markerClusterGroup);

  // Port congestion heatmap markers
  state.ports.forEach(port => {
    const congestionColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' }[port.congestion];
    const radius = { low: 8, medium: 14, high: 20, critical: 28 }[port.congestion] || 8;
    const icon = L.divIcon({
      html: `<div style="width:${radius}px;height:${radius}px;border-radius:50%;background:${congestionColor};border:2px solid rgba(0,0,0,0.3);opacity:0.75;box-shadow:0 0 10px ${congestionColor}66"></div>`,
      className: '', iconSize: [radius, radius], iconAnchor: [radius / 2, radius / 2],
    });
    L.marker(port.coords, { icon })
      .addTo(mapInstance!)
      .bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">${port.name} (${port.locode})</div>
          <div style="font-size:11px;color:#888;margin-bottom:6px">${port.country}</div>
          <div style="font-size:11px">Congestion: <strong style="color:${congestionColor}">${port.congestion.toUpperCase()}</strong></div>
          ${port.weatherAlert ? `<div style="font-size:11px;margin-top:4px">Weather: <span style="color:var(--accent-amber)">${port.weatherAlert}</span></div>` : ''}
        </div>
      `);
  });

  // Subscribe to theme changes to update map tiles
  store.subscribe((state) => {
    if (!mapInstance) return;
    const newIsDark = state.theme === 'dark';
    const newTileUrl = newIsDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    mapInstance.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) mapInstance?.removeLayer(layer);
    });
    L.tileLayer(newTileUrl, { maxZoom: 18, subdomains: 'abcd' }).addTo(mapInstance);
  });
}

function renderTrackList(fleet: any[]): void {
  const list = document.getElementById('track-list');
  if (!list) return;

  if (fleet.length === 0) {
    list.innerHTML = `
      <div style="padding:var(--space-4);text-align:center;color:var(--text-muted);font-size:12px">
        Waiting for live vessels...
      </div>
    `;
    return;
  }

  const pins = getPinnedMMSIs();
  const pinned = fleet.filter(s => pins.has(s.mmsi));
  const rest = [...fleet]
    .filter(s => !pins.has(s.mmsi))
    .sort((a, b) => (b.updated?.getTime() || 0) - (a.updated?.getTime() || 0));

  const renderItem = (s: any, pinned: boolean) => {
    const typeInfo = cachedShipTypeInfo(s.type);
    return `
    <div class="track-list-item" data-name="${s.name}" data-mmsi="${s.mmsi}" style="
      padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:4px;
      cursor:pointer;transition:background 150ms ease;
      border:1px solid ${pinned ? 'var(--accent-amber)' : 'transparent'};
      background:${pinned ? 'rgba(245,158,11,0.05)' : 'var(--bg-elevated)'};
    "
    onmouseenter="this.style.background='var(--bg-hover)'"
    onmouseleave="this.style.background='${pinned ? 'rgba(245,158,11,0.05)' : 'var(--bg-elevated)'}'"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          ${pinned ? '<span style="font-size:12px;flex-shrink:0">ðŸ“Œ</span>' : ''}
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${typeInfo.color};box-shadow:0 0 4px ${typeInfo.color}88;margin-top:4px"></div>
          <button onclick="event.stopPropagation();window.__pinVessel(${s.mmsi})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:13px;padding:0;" title="Pin/Unpin">
            ${pinned ? 'â­' : 'â˜†'}
          </button>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-bottom:4px">${s.mmsi}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary)">
        <div>${s.sog !== undefined ? s.sog.toFixed(1) + ' kn' : '--'}</div>
        <div>${s.destination ? s.destination.substring(0, 12) + (s.destination.length > 12 ? '...' : '') : 'Unknown Dest'}</div>
      </div>
    </div>
  `;
  };

  let html = '';
  if (pinned.length > 0) {
    html += `<div style="font-size:10px;color:var(--accent-amber);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:var(--space-1) var(--space-2);margin-bottom:4px">Pinned Vessels</div>`;
    html += pinned.map(s => renderItem(s, true)).join('');
    html += `<div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:var(--space-1) var(--space-2);margin-top:var(--space-2);margin-bottom:4px">All Vessels</div>`;
  }
  html += rest.map(s => renderItem(s, false)).join('');

  list.innerHTML = html;

  // Click to pan map to vessel
  list.querySelectorAll<HTMLElement>('.track-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const mmsi = parseInt(el.dataset.mmsi || '0');
      const ship = fleet.find(s => s.mmsi === mmsi);
      if (ship?.lat && ship?.lng) {
        mapInstance?.setView([ship.lat, ship.lng], 10, { animate: true });
      }
    });
  });
}
