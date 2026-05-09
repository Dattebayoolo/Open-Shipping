// ============================================================
// SHIPMENTS (LIVE VESSELS) PAGE
// ============================================================

import { store } from '@/store';

let filteredShips: any[] = [];
let searchQuery = '';
let typeFilter = 'all';
let unsubscribe: (() => void) | null = null;

function getShipTypeInfo(type: number): { label: string; color: string } {
  if (!type) return { label: 'Unknown', color: '#888' };
  if (type >= 70 && type <= 79) return { label: 'Cargo', color: '#10b981' };
  if (type >= 80 && type <= 89) return { label: 'Tanker', color: '#ef4444' };
  if (type >= 60 && type <= 69) return { label: 'Passenger', color: '#3b82f6' };
  if (type >= 30 && type <= 39) return { label: 'Fishing', color: '#f59e0b' };
  if (type >= 40 && type <= 49) return { label: 'High Speed', color: '#8b5cf6' };
  if (type >= 50 && type <= 59) return { label: 'Special Craft', color: '#06b6d4' };
  return { label: 'Other', color: '#94a3b8' };
}

function getNavStatus(status: number): string {
  const map: Record<number, string> = {
    0: 'Under way using engine',
    1: 'At anchor',
    2: 'Not under command',
    3: 'Restricted maneuverability',
    4: 'Constrained by draught',
    5: 'Moored',
    6: 'Aground',
    7: 'Engaged in fishing',
    8: 'Under way sailing',
  };
  return map[status] || 'Unknown status';
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export function renderShipments(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Clear state on re-render to avoid duplicates if disconnected
  liveShips.clear();
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
          <button class="btn btn-secondary btn-sm" id="export-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
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
  
  if (unsubscribe) unsubscribe();
  unsubscribe = store.subscribe(updateFromStore);
  updateFromStore(store.getState());
}

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
        <div style="font-size:var(--text-sm)">${getNavStatus(s.navStatus)}</div>
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

  title.textContent = ship.name;
  subtitle.textContent = `MMSI: ${ship.mmsi} ${ship.callsign ? '· ' + ship.callsign : ''}`;

  let dims = '--';
  if (ship.dim && (ship.dim.A || ship.dim.B)) {
    const len = ship.dim.A + ship.dim.B;
    const wid = ship.dim.C + ship.dim.D;
    dims = `${len}m × ${wid}m`;
  }

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-5)">

      <!-- Status + Mode -->
      <div style="display:flex;gap:var(--space-2)">
        <span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${typeInfo.label}</span>
        <span class="badge badge-neutral">${getNavStatus(ship.navStatus)}</span>
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

    </div>
  `;

  drawer.classList.add('open');
  overlay.classList.remove('hidden');
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
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const headers = ['Name', 'MMSI', 'Callsign', 'IMO', 'Type', 'NavStatus', 'SOG', 'COG', 'Lat', 'Lng', 'Destination'];
    const rows = filteredShips.map(s => [
      `"${s.name || ''}"`, s.mmsi, `"${s.callsign || ''}"`, s.imo || '', getShipTypeInfo(s.type).label, 
      `"${getNavStatus(s.navStatus)}"`, s.sog, s.cog, s.lat, s.lng, `"${s.destination || ''}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'live_fleet.csv' });
    a.click();
  });
}
