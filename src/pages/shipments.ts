// ============================================================
// SHIPMENTS (LIVE VESSELS) PAGE
// ============================================================

import { store } from '@/store';
import { getShipTypeInfo, getNavStatusLong, relativeTime, formatDimensions } from '@/utils/ship';

let filteredShips: any[] = [];
let searchQuery = '';
let typeFilter = 'all';
let unsubscribe: (() => void) | null = null;

export function renderShipments(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Clear state on re-render
  filteredShips = [];

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Live Fleet Explorer</h2>
          <p class="page-subheading" style="display:flex;align-items:center;gap:var(--space-2)">
            Real-time global vessel telemetry
            <span id="ship-ais-status" class="badge badge-neutral" style="font-size:10px">Connecting to Proxy...</span>
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-secondary btn-sm" id="export-json-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export JSON
          </button>
          <button class="btn btn-secondary btn-sm" id="export-geojson-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
            Export GeoJSON
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="ship-search" type="text" placeholder="Search by Name, MMSI, Callsign…" value="${searchQuery}" />
        </div>
        <select class="filter-select" id="type-filter">
          <option value="all">All Vessel Types</option>
          <option value="Cargo" ${typeFilter === 'Cargo' ? 'selected' : ''}>Cargo</option>
          <option value="Tanker" ${typeFilter === 'Tanker' ? 'selected' : ''}>Tanker</option>
          <option value="Passenger" ${typeFilter === 'Passenger' ? 'selected' : ''}>Passenger</option>
          <option value="Fishing" ${typeFilter === 'Fishing' ? 'selected' : ''}>Fishing</option>
          <option value="High Speed" ${typeFilter === 'High Speed' ? 'selected' : ''}>High Speed</option>
        </select>
        <!-- Saved filters dropdown -->
        <select class="filter-select" id="saved-filters" style="margin-left:var(--space-2)">
          <option value="">Saved Filters</option>
        </select>
        <button class="btn btn-ghost btn-sm" id="save-filter-btn" title="Save current filter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <span id="result-count" style="font-size:var(--text-sm);color:var(--text-muted);margin-left:auto">0 vessels</span>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="data-table" id="shipments-table">
          <thead>
            <tr>
              <th>Vessel Name</th>
              <th>MMSI / Callsign</th>
              <th>Type</th>
              <th>Nav Status</th>
              <th>Speed / Course</th>
              <th>Destination</th>
              <th>Last Update</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="shipments-tbody">
            <tr><td colspan="8"><div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L4 10v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10L12 2z"/></svg><h3>Connecting to AIS Stream</h3><p>Waiting for real-time vessel data...</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Drawer -->
    <div id="shipment-drawer" class="drawer" role="dialog" aria-label="Vessel details">
      <div class="drawer-header">
        <div>
          <h3 id="drawer-title" style="font-size:var(--text-base);font-weight:var(--weight-semibold)">Vessel Details</h3>
          <span id="drawer-subtitle" style="font-size:var(--text-xs);color:var(--text-muted)"></span>
        </div>
        <button class="btn btn-ghost btn-icon" id="drawer-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="drawer-body" id="drawer-body"></div>
    </div>
    <div id="drawer-overlay" class="modal-overlay hidden" style="z-index:940"></div>
  `;

  bindEvents();
  loadSavedFilters();

  if (unsubscribe) unsubscribe();
  unsubscribe = store.subscribe(updateFromStore);
  updateFromStore(store.getState());
}

// ── Saved Filters (localStorage) ────────────────────────────
function loadSavedFilters(): void {
  const sel = document.getElementById('saved-filters') as HTMLSelectElement;
  if (!sel) return;
  const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]') as { name: string; query: string; type: string }[];
  sel.innerHTML = '<option value="">Saved Filters</option>' + saved.map((f, i) => `<option value="${i}">${f.name}</option>`).join('');
  sel.addEventListener('change', () => {
    const idx = parseInt(sel.value);
    if (isNaN(idx)) return;
    const filter = saved[idx];
    if (!filter) return;
    searchQuery = filter.query;
    typeFilter = filter.type;
    const searchInput = document.getElementById('ship-search') as HTMLInputElement;
    const typeSelect = document.getElementById('type-filter') as HTMLSelectElement;
    if (searchInput) searchInput.value = searchQuery;
    if (typeSelect) typeSelect.value = typeFilter;
    applyFilter();
  });
}

function saveCurrentFilter(): void {
  const name = prompt('Name this filter:');
  if (!name) return;
  const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]') as { name: string; query: string; type: string }[];
  saved.push({ name, query: searchQuery, type: typeFilter });
  localStorage.setItem('savedFilters', JSON.stringify(saved));
  loadSavedFilters();
}

// ── Store subscription ──────────────────────────────────────
function updateFromStore(state: any) {
  const statusEl = document.getElementById('ship-ais-status');
  if (statusEl) {
    statusEl.className = `badge ${state.aisStatus === 'live' ? 'badge-green' : 'badge-neutral'}`;
    statusEl.textContent = state.aisStatus === 'live' ? 'Live AIS Connected' : state.aisStatus;
  }

  applyFilter();
}

function applyFilter(): void {
  const q = searchQuery.toLowerCase();
  const state = store.getState();
  const fleet = state.liveFleet || [];

  filteredShips = fleet.filter(s => {
    const typeInfo = getShipTypeInfo(s.type);
    const matchSearch = !q ||
      s.mmsi.toString().includes(q) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.callsign && s.callsign.toLowerCase().includes(q)) ||
      (s.destination && s.destination.toLowerCase().includes(q));
    const matchType = typeFilter === 'all' || typeInfo.label === typeFilter;
    return matchSearch && matchType;
  });

  // Sort by most recently updated
  filteredShips.sort((a, b) => (b.updated?.getTime() || 0) - (a.updated?.getTime() || 0));

  renderTable();

  const count = document.getElementById('result-count');
  if (count) count.textContent = `${filteredShips.length} vessels`;
}

function renderTable(): void {
  const tbody = document.getElementById('shipments-tbody');
  if (!tbody) return;

  if (!filteredShips.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8"/></svg><h3>No vessels found</h3><p>Try adjusting your filters or wait for more data</p></div></td></tr>`;
    return;
  }

  // Only render top 100 to keep DOM fast
  const displayShips = filteredShips.slice(0, 100);

  tbody.innerHTML = displayShips.map(s => {
    const typeInfo = getShipTypeInfo(s.type);
    return `
    <tr data-mmsi="${s.mmsi}" class="shipment-row">
      <td style="font-weight:var(--weight-semibold);color:var(--text-primary);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${s.name}">${s.name}</td>
      <td>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-secondary)">${s.mmsi}</div>
        ${s.callsign ? `<div style="font-size:10px;color:var(--text-muted)">${s.callsign}</div>` : ''}
      </td>
      <td>
        <span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${typeInfo.label}</span>
      </td>
      <td>
        <div style="font-size:var(--text-sm)">${getNavStatusLong(s.navStatus)}</div>
      </td>
      <td>
        <div style="font-variant-numeric:tabular-nums;font-weight:500">${s.sog !== undefined ? s.sog.toFixed(1) + ' kn' : '--'}</div>
        <div style="font-size:10px;color:var(--text-muted)">${s.cog !== undefined ? s.cog.toFixed(1) + '°' : '--'}</div>
      </td>
      <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${s.destination || '<span style="color:var(--text-muted)">Unknown</span>'}
      </td>
      <td style="color:var(--text-muted);font-size:var(--text-sm)">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 4px var(--accent-green)"></div>
          ${s.updated ? relativeTime(s.updated) : '--'}
        </div>
      </td>
      <td>
        <button class="btn btn-ghost btn-icon btn-sm view-detail" aria-label="View details">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </td>
    </tr>
  `}).join('');

  tbody.querySelectorAll('.shipment-row, .view-detail').forEach(el => {
    el.addEventListener('click', (e) => {
      const row = (e.currentTarget as HTMLElement).closest('tr');
      const mmsi = row?.dataset.mmsi;
      if (mmsi) openDrawer(Number(mmsi));
    });
  });
}

function openDrawer(mmsi: number): void {
  const state = store.getState();
  const ship = (state.liveFleet || []).find((s: any) => s.mmsi === mmsi);
  if (!ship) return;

  const drawer = document.getElementById('shipment-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const title = document.getElementById('drawer-title');
  const subtitle = document.getElementById('drawer-subtitle');
  const body = document.getElementById('drawer-body');

  if (!drawer || !overlay || !title || !subtitle || !body) return;

  const typeInfo = getShipTypeInfo(ship.type);
  const dims = formatDimensions(ship.dim);

  title.textContent = ship.name;
  subtitle.textContent = `MMSI: ${ship.mmsi} ${ship.callsign ? '· ' + ship.callsign : ''}`;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-5)">

      <!-- Status + Mode -->
      <div style="display:flex;gap:var(--space-2)">
        <span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${typeInfo.label}</span>
        <span class="badge badge-neutral">${getNavStatusLong(ship.navStatus)}</span>
      </div>

      <!-- Route -->
      <div class="card" style="padding:var(--space-4)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3)">
          <div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">LIVE COORDINATES</div>
            <div style="font-size:var(--text-base);font-weight:700;font-family:'JetBrains Mono',monospace">${ship.lat ? ship.lat.toFixed(4) : '--'}° N</div>
            <div style="font-size:var(--text-base);font-weight:700;font-family:'JetBrains Mono',monospace">${ship.lng ? ship.lng.toFixed(4) : '--'}° E</div>
          </div>
          <div style="color:var(--text-muted);font-size:20px">→</div>
          <div style="text-align:right">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">DESTINATION</div>
            <div style="font-size:var(--text-base);font-weight:700">${ship.destination || 'Unknown'}</div>
          </div>
        </div>
      </div>

      <!-- Telemetry -->
      <div>
        <h4 style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-3);color:var(--text-secondary)">TELEMETRY</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">SPEED (SOG)</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${ship.sog !== undefined ? ship.sog.toFixed(1) + ' kn' : '--'}</div>
          </div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">COURSE (COG)</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${ship.cog !== undefined ? ship.cog.toFixed(1) + '°' : '--'}</div>
          </div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">HEADING</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${ship.heading && ship.heading !== 511 ? ship.heading + '°' : '--'}</div>
          </div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">DIMENSIONS</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${dims}</div>
          </div>
        </div>
      </div>

      <!-- Identification -->
      <div>
        <h4 style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-3);color:var(--text-secondary)">IDENTIFICATION</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">IMO NUMBER</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${ship.imo || '--'}</div>
          </div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">CALLSIGN</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${ship.callsign || '--'}</div>
          </div>
        </div>
      </div>

      <!-- ETA Prediction -->
      <div>
        <h4 style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-3);color:var(--text-secondary)">ETA PREDICTION</h4>
        <div id="eta-prediction" style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border)">
          ${calculateETA(ship)}
        </div>
      </div>

    </div>
  `;

  drawer.classList.add('open');
  overlay.classList.remove('hidden');
}

// ── ETA Prediction ──────────────────────────────────────────
function calculateETA(ship: any): string {
  if (!ship.lat || !ship.lng || !ship.destination || !ship.sog || ship.sog <= 0) {
    return '<div style="font-size:var(--text-sm);color:var(--text-muted)">Insufficient data for ETA calculation</div>';
  }

  // Simple Haversine to a rough destination coordinate
  // Since we don't have dest lat/lng, estimate based on common routes
  const DEST_COORDS: Record<string, [number, number]> = {
    'SINGAPORE': [1.3521, 103.8198],
    'SHANGHAI': [31.2304, 121.4737],
    'ROTTERDAM': [51.9244, 4.4777],
    'HONG KONG': [22.3193, 114.1694],
    'SHENZHEN': [22.5431, 114.0579],
    'BUSAN': [35.1796, 129.0756],
    'NINGBO': [29.8683, 121.5440],
    'QINGDAO': [36.0671, 120.3826],
    'JEBEL ALI': [25.0108, 55.0583],
    'ANTWERP': [51.2213, 4.3997],
    'HAMBURG': [53.5511, 9.9937],
    'LOS ANGELES': [33.7489, -118.2469],
    'LONG BEACH': [33.7701, -118.1937],
    'NEW YORK': [40.7128, -74.0060],
    'HOUSTON': [29.7604, -95.3698],
    'MUMBAI': [18.9438, 72.8226],
    'PIRAEUS': [37.9426, 23.6469],
    'VALENCIA': [39.4699, -0.3763],
    'FELIXSTOWE': [51.9638, 1.3513],
  };

  const dest = ship.destination.toUpperCase().trim();
  let destCoords: [number, number] | null = null;

  // Try exact match, then partial match
  if (DEST_COORDS[dest]) {
    destCoords = DEST_COORDS[dest];
  } else {
    for (const [key, coords] of Object.entries(DEST_COORDS)) {
      if (dest.includes(key) || key.includes(dest)) {
        destCoords = coords;
        break;
      }
    }
  }

  if (!destCoords) {
    return '<div style="font-size:var(--text-sm);color:var(--text-muted)">Destination coordinates unknown for ETA calculation</div>';
  }

  // Haversine distance
  const R = 6371; // km
  const dLat = (destCoords[0] - ship.lat) * Math.PI / 180;
  const dLon = (destCoords[1] - ship.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(ship.lat * Math.PI / 180) * Math.cos(destCoords[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Speed in km/h (1 knot = 1.852 km/h)
  const speedKmh = ship.sog * 1.852;
  const hoursRemaining = distanceKm / speedKmh;
  const etaDate = new Date(Date.now() + hoursRemaining * 3600000);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-2)">
      <div>
        <div style="font-size:var(--text-xs);color:var(--text-muted)">Distance</div>
        <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Math.round(distanceKm).toLocaleString()} km</div>
      </div>
      <div>
        <div style="font-size:var(--text-xs);color:var(--text-muted)">Est. Time</div>
        <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Math.round(hoursRemaining)}h ${Math.round((hoursRemaining % 1) * 60)}m</div>
      </div>
      <div>
        <div style="font-size:var(--text-xs);color:var(--text-muted)">Predicted ETA</div>
        <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${etaDate.toLocaleDateString()} ${etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  `;
}

function closeDrawer(): void {
  document.getElementById('shipment-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.add('hidden');
}

function bindEvents(): void {
  document.getElementById('ship-search')?.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    applyFilter();
  });
  document.getElementById('type-filter')?.addEventListener('change', (e) => {
    typeFilter = (e.target as HTMLSelectElement).value;
    applyFilter();
  });
  document.getElementById('drawer-close')?.addEventListener('click', closeDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);

  // Save filter
  document.getElementById('save-filter-btn')?.addEventListener('click', saveCurrentFilter);

  // Export CSV
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    const headers = ['Name', 'MMSI', 'Callsign', 'IMO', 'Type', 'NavStatus', 'SOG', 'COG', 'Lat', 'Lng', 'Destination'];
    const rows = filteredShips.map((s: any) => [
      `"${s.name || ''}"`, s.mmsi, `"${s.callsign || ''}"`, s.imo || '', getShipTypeInfo(s.type).label,
      `"${getNavStatusLong(s.navStatus)}"`, s.sog, s.cog, s.lat, s.lng, `"${s.destination || ''}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'live_fleet.csv' });
    a.click();
  });

  // Export JSON
  document.getElementById('export-json-btn')?.addEventListener('click', () => {
    const json = JSON.stringify(filteredShips, null, 2);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: 'live_fleet.json' });
    a.click();
  });

  // Export GeoJSON
  document.getElementById('export-geojson-btn')?.addEventListener('click', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredShips.map((s: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          name: s.name,
          mmsi: s.mmsi,
          callsign: s.callsign,
          imo: s.imo,
          type: getShipTypeInfo(s.type).label,
          sog: s.sog,
          cog: s.cog,
          destination: s.destination,
          navStatus: getNavStatusLong(s.navStatus),
        }
      }))
    };
    const json = JSON.stringify(geojson, null, 2);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json], { type: 'application/geo+json' })), download: 'live_fleet.geojson' });
    a.click();
  });
}