// ============================================================
// LIVE TRACKING PAGE
// ============================================================

import { store } from '@/store';
import L from 'leaflet';
import { getShipTypeInfo, formatDimensions } from '@/utils/ship';

let mapInstance: L.Map | null = null;
const liveMarkers: Map<number, L.Marker> = new Map();
let unsubscribe: (() => void) | null = null;

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
          <button class="btn btn-secondary btn-sm" id="weather-toggle" title="Toggle Weather Overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
            Weather
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
            <input type="text" id="track-search" placeholder="Search vessels…" style="width:100%" />
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

  // Weather overlay toggle (placeholder - will add actual tile layer later)
  let weatherVisible = false;
  document.getElementById('weather-toggle')?.addEventListener('click', () => {
    weatherVisible = !weatherVisible;
    const btn = document.getElementById('weather-toggle');
    if (btn) btn.style.opacity = weatherVisible ? '1' : '0.5';
    // TODO: Add actual weather tile layer integration
  });

  setTimeout(() => {
    initMap();
    if (unsubscribe) unsubscribe();
    unsubscribe = store.subscribe(updateFromStore);
    updateFromStore(store.getState());
  }, 100);
}

function updateAisStatus(status: string) {
  const el = document.getElementById('ais-status');
  if (el) {
    el.className = `badge ${status === 'live' ? 'badge-green' : 'badge-neutral'}`;
    el.textContent = status === 'live' ? 'Live AIS Connected' : status;
  }
}

function updateFromStore(state: any) {
  updateAisStatus(state.aisStatus);

  if (!mapInstance) return;

  const fleet = state.liveFleet || [];
  fleet.forEach((ship: any) => updateLiveMarker(ship));

  renderTrackList(fleet);
}

function updateLiveMarker(ship: any) {
  if (!mapInstance || !ship.lat || !ship.lng) return;

  const typeInfo = getShipTypeInfo(ship.type);
  const rotation = ship.cog || ship.heading || 0;
  const speed = ship.sog !== undefined ? ship.sog.toFixed(1) : '--';
  const cog = ship.cog !== undefined ? ship.cog.toFixed(1) : '--';
  const heading = ship.heading && ship.heading !== 511 ? ship.heading + '°' : '--';
  const dims = formatDimensions(ship.dim);

  const svgIcon = `
    <div style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5))">
      <svg viewBox="0 0 24 24" style="transform: rotate(${rotation}deg); width: 16px; height: 16px;">
        <path d="M12 2L4 10v10a2 2 0 002 2h12a2 2 0 002-2V10L12 2z" fill="${typeInfo.color}" stroke="rgba(0,0,0,0.8)" stroke-width="1.5"/>
      </svg>
    </div>
  `;

  let marker = liveMarkers.get(ship.mmsi);

  if (!marker) {
    const icon = L.divIcon({
      html: svgIcon,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    });
    marker = L.marker([ship.lat, ship.lng], { icon }).addTo(mapInstance);
    liveMarkers.set(ship.mmsi, marker);
  } else {
    marker.setLatLng([ship.lat, ship.lng]);
    marker.setIcon(L.divIcon({ html: svgIcon, className: '', iconSize: [16, 16], iconAnchor: [8, 8] }));
  }

  marker.bindPopup(`
    <div style="font-family:Inter,sans-serif;min-width:280px;padding:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--text-primary);line-height:1.2;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ship.name}">${ship.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:2px">
            MMSI: ${ship.mmsi} ${ship.imo ? `· IMO: ${ship.imo}` : ''} ${ship.callsign ? `· ${ship.callsign}` : ''}
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
          <div style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${cog}°</div>
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
      
      <div style="font-size:10px;color:var(--text-muted);margin-top:8px;display:flex;align-items:center;gap:6px;border-top:1px solid var(--border);padding-top:8px">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 4px var(--accent-green)"></div>
        Live AIS Data · ${ship.updated?.toLocaleTimeString() ?? 'just now'}
      </div>
    </div>
  `);
}

function initMap(): void {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    liveMarkers.clear();
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

  // Port congestion heatmap markers
  state.ports.forEach(port => {
    const congestionColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' }[port.congestion];
    const radius = { low: 8, medium: 14, high: 20, critical: 28 }[port.congestion] || 8;
    const icon = L.divIcon({
      html: `<div style="width:${radius}px;height:${radius}px;border-radius:50%;background:${congestionColor};border:2px solid rgba(0,0,0,0.3);opacity:0.8;box-shadow:0 0 8px ${congestionColor}66"></div>`,
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
    // Update tile layer
    mapInstance.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstance?.removeLayer(layer);
      }
    });
    L.tileLayer(newTileUrl, { maxZoom: 18, subdomains: 'abcd' }).addTo(mapInstance);
  });
}

function renderTrackList(fleet: any[]): void {
  const list = document.getElementById('track-list');
  if (!list) return;

  const ships = [...fleet].sort((a, b) => (b.updated?.getTime() || 0) - (a.updated?.getTime() || 0));

  if (ships.length === 0) {
    list.innerHTML = `
      <div style="padding:var(--space-4);text-align:center;color:var(--text-muted);font-size:12px">
        Waiting for live vessels...
      </div>
    `;
    return;
  }

  list.innerHTML = ships.map(s => {
    const typeInfo = getShipTypeInfo(s.type);
    return `
    <div class="track-list-item" style="
      padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:4px;
      cursor:pointer;transition:background 150ms ease;border:1px solid transparent;
      background:var(--bg-elevated);
    "
    onmouseenter="this.style.background='var(--bg-hover)';this.style.borderColor='var(--border)'"
    onmouseleave="this.style.background='var(--bg-elevated)';this.style.borderColor='transparent'"
    onclick="mapInstance?.setView([${s.lat}, ${s.lng}], 10)"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="width:8px;height:8px;border-radius:50%;background:${typeInfo.color};box-shadow:0 0 4px ${typeInfo.color}88;margin-top:4px"></div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-bottom:4px">${s.mmsi}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary)">
        <div>${s.sog !== undefined ? s.sog.toFixed(1) + ' kn' : '--'}</div>
        <div>${s.destination ? s.destination.substring(0, 12) + (s.destination.length > 12 ? '...' : '') : 'Unknown Dest'}</div>
      </div>
    </div>
  `}).join('');
}