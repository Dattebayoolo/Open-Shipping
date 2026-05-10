// ============================================================
// FLEET PAGE (LIVE AIS ENABLED)
// ============================================================

import { store } from '@/store';
import { getShipTypeInfo, getNavStatus, TYPE_EMOJI, formatDimensions } from '@/utils/ship';

function generateRandomUtilization(mmsi: number): number {
  // Deterministic random based on MMSI
  return 40 + ((mmsi * 13) % 60);
}

let viewMode: 'grid' | 'table' = 'grid';
let unsubscribe: (() => void) | null = null;
let currentFleet: any[] = [];
const selectedMMSIs = new Set<number>();

export function unmountFleet(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function renderFleet(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  if (unsubscribe) unsubscribe();

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Live Fleet Tracker</h2>
          <p class="page-subheading" id="fleet-count">0 vessels tracked</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}" id="grid-view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Grid
          </button>
          <button class="btn btn-secondary btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}" id="table-view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Table
          </button>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="grid-4" style="margin-bottom:var(--space-5)" id="fleet-kpis">
        <!-- Rendered by JS -->
      </div>

      <div id="fleet-content"></div>
    </div>
  `;

  document.getElementById('grid-view')?.addEventListener('click', () => {
    viewMode = 'grid';
    renderFleetContent();
  });
  document.getElementById('table-view')?.addEventListener('click', () => {
    viewMode = 'table';
    renderFleetContent();
  });

  // Inject compare panel + bar into DOM
  if (!document.getElementById('compare-panel')) {
    const panel = document.createElement('div');
    panel.id = 'compare-panel';
    panel.className = 'compare-panel';
    document.body.appendChild(panel);
  }
  if (!document.getElementById('compare-bar')) {
    const bar = document.createElement('div');
    bar.id = 'compare-bar';
    bar.className = 'compare-bar';
    document.body.appendChild(bar);
  }
  selectedMMSIs.clear();
  updateCompareBar();

  unsubscribe = store.subscribe(updateFromStore);
  updateFromStore(store.getState());
}

function updateFromStore(state: any) {
  // Keep only the first 60 ships for the grid to avoid blowing up the DOM
  currentFleet = (state.liveFleet || []).slice(0, 60);

  const countEl = document.getElementById('fleet-count');
  if (countEl) countEl.textContent = `${state.liveFleet?.length || 0} vessels tracked`;

  const kpis = document.getElementById('fleet-kpis');
  if (kpis) {
    const atSea = currentFleet.filter(v => v.navStatus === 0 || v.navStatus === 8).length;
    const moored = currentFleet.filter(v => v.navStatus === 1 || v.navStatus === 5).length;
    const avgUtil = currentFleet.length ? Math.round(currentFleet.reduce((s, v) => s + generateRandomUtilization(v.mmsi), 0) / currentFleet.length) : 0;

    kpis.innerHTML = [
      { label: 'Under Way', value: atSea, cls: 'blue' },
      { label: 'Moored / Anchor', value: moored, cls: 'green' },
      { label: 'Cargo Ships', value: currentFleet.filter(v => getShipTypeInfo(v.type).label === 'Cargo').length, cls: 'amber' },
      { label: 'Est. Utilization', value: `${avgUtil}%`, cls: 'red' },
    ].map(({ label, value, cls }) => `
      <div class="kpi-card ${cls}">
        <div class="kpi-header"><span class="kpi-label">${label}</span></div>
        <div class="kpi-value">${value}</div>
      </div>
    `).join('');
  }

  renderFleetContent();
}

function renderFleetContent(): void {
  const container = document.getElementById('fleet-content');
  if (!container) return;

  // Update active state of buttons
  document.getElementById('grid-view')?.classList.toggle('btn-primary', viewMode === 'grid');
  document.getElementById('table-view')?.classList.toggle('btn-primary', viewMode === 'table');

  if (viewMode === 'grid') {
    container.innerHTML = `
      <div class="grid-3">
        ${currentFleet.map((v, i) => {
      const typeInfo = getShipTypeInfo(v.type);
      const util = generateRandomUtilization(v.mmsi);
      const utilClass = util >= 90 ? 'high' : util >= 70 ? 'med' : '';
      const dims = formatDimensions(v.dim);

      return `
            <div class="fleet-card stagger-${Math.min(i + 1, 6)}" style="position:relative">
              <label style="position:absolute;top:var(--space-3);right:var(--space-3);z-index:2;cursor:pointer;" title="Select for comparison" onclick="event.stopPropagation()">
                <input type="checkbox" class="vessel-check" data-mmsi="${v.mmsi}" ${selectedMMSIs.has(v.mmsi) ? 'checked' : ''}
                  style="width:14px;height:14px;accent-color:var(--accent-green);cursor:pointer;" />
              </label>
              <div class="fleet-card-header">
                <div class="vessel-icon">${TYPE_EMOJI[typeInfo.label] ?? '\u{1F6A2}'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.name}">${v.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted)">IMO: ${v.imo || '--'} · ${typeInfo.label}</div>
                </div>
                <span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40;margin-right:20px">${getNavStatus(v.navStatus)}</span>
              </div>

              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-1)">
                Estimated Utilization
              </div>
              <div class="utilization-bar">
                <div class="utilization-fill ${utilClass}" style="width:${util}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs)">
                <span style="color:${util >= 90 ? 'var(--accent-red)' : util >= 70 ? 'var(--accent-amber)' : 'var(--accent-green)'};font-weight:var(--weight-semibold)">${util}%</span>
                <span style="color:var(--text-muted)">Length: ${dims}</span>
              </div>

              <div class="divider"></div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
                <div style="font-size:var(--text-xs)">
                  <div style="color:var(--text-muted)">Speed (SOG)</div>
                  <div style="color:var(--text-primary);font-weight:500">${v.sog !== undefined ? v.sog.toFixed(1) + ' kn' : '--'}</div>
                </div>
                <div style="font-size:var(--text-xs);min-width:0">
                  <div style="color:var(--text-muted)">Destination</div>
                  <div style="color:var(--text-primary);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.destination || 'Unknown'}">${v.destination || 'Unknown'}</div>
                </div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

    // Wire grid card checkbox events
    container.querySelectorAll<HTMLInputElement>('.vessel-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const mmsi = parseInt((e.target as HTMLInputElement).dataset.mmsi || '0');
        if ((e.target as HTMLInputElement).checked) {
          if (selectedMMSIs.size >= 4) {
            (e.target as HTMLInputElement).checked = false;
            return;
          }
          selectedMMSIs.add(mmsi);
        } else {
          selectedMMSIs.delete(mmsi);
        }
        updateCompareBar();
      });
    });

  } else {
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px"></th>
              <th>Vessel</th><th>Type</th><th>MMSI / Callsign</th><th>Status</th>
              <th>Speed</th><th>Destination</th><th>Length</th>
            </tr>
          </thead>
          <tbody>
            ${currentFleet.map(v => {
      const typeInfo = getShipTypeInfo(v.type);
      const dims = formatDimensions(v.dim);
      return `
                <tr>
                  <td><input type="checkbox" class="vessel-check" data-mmsi="${v.mmsi}" ${selectedMMSIs.has(v.mmsi) ? 'checked' : ''} style="width:14px;height:14px;accent-color:var(--accent-green);cursor:pointer;"/></td>
                  <td style="font-weight:var(--weight-medium);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.name}">${v.name}</td>
                  <td><span class="mode-badge">${TYPE_EMOJI[typeInfo.label] ?? '\u{1F6A2}'} ${typeInfo.label}</span></td>
                  <td>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:11px">${v.mmsi}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${v.callsign || ''}</div>
                  </td>
                  <td><span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${getNavStatus(v.navStatus)}</span></td>
                  <td style="font-variant-numeric:tabular-nums;font-weight:500">${v.sog !== undefined ? v.sog.toFixed(1) + ' kn' : '--'}</td>
                  <td style="color:var(--text-secondary);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.destination}">${v.destination || '--'}</td>
                  <td style="color:var(--text-secondary)">${dims}</td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Wire checkbox events in table
    container.querySelectorAll<HTMLInputElement>('.vessel-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const mmsi = parseInt((e.target as HTMLInputElement).dataset.mmsi || '0');
        if ((e.target as HTMLInputElement).checked) {
          if (selectedMMSIs.size >= 4) {
            (e.target as HTMLInputElement).checked = false;
            return;
          }
          selectedMMSIs.add(mmsi);
        } else {
          selectedMMSIs.delete(mmsi);
        }
        updateCompareBar();
      });
    });
  }
}

// ── Comparison bar (floating pill) ─────────────────────────────────────────
function updateCompareBar(): void {
  const bar = document.getElementById('compare-bar');
  if (!bar) return;

  if (selectedMMSIs.size < 2) {
    bar.classList.remove('visible');
    bar.innerHTML = '';
    document.getElementById('compare-panel')?.classList.remove('open');
    return;
  }

  bar.classList.add('visible');
  bar.innerHTML = `
    <span style="color:var(--text-muted);font-size:12px">${selectedMMSIs.size} vessels selected</span>
    <button class="btn btn-primary btn-sm" id="open-compare-btn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Compare
    </button>
    <button class="btn btn-ghost btn-sm" id="clear-compare-btn">Clear</button>
  `;

  document.getElementById('open-compare-btn')?.addEventListener('click', openComparePanel);
  document.getElementById('clear-compare-btn')?.addEventListener('click', () => {
    selectedMMSIs.clear();
    document.querySelectorAll<HTMLInputElement>('.vessel-check').forEach(cb => cb.checked = false);
    updateCompareBar();
  });
}

// ── Comparison panel (slide-up drawer) ─────────────────────────────────────
function openComparePanel(): void {
  const panel = document.getElementById('compare-panel');
  if (!panel) return;

  const vessels = currentFleet.filter(v => selectedMMSIs.has(v.mmsi));
  if (vessels.length < 2) return;

  const gridCols = `180px ${vessels.map(() => '1fr').join(' ')}`;

  const rows: { label: string; values: string[] }[] = [
    { label: 'Name',        values: vessels.map(v => v.name) },
    { label: 'MMSI',        values: vessels.map(v => `<span style="font-family:monospace;font-size:11px">${v.mmsi}</span>`) },
    { label: 'Type',        values: vessels.map(v => { const t = getShipTypeInfo(v.type); return `<span class="badge badge-neutral" style="background:${t.color}20;color:${t.color};border-color:${t.color}40">${t.label}</span>`; }) },
    { label: 'Nav Status',  values: vessels.map(v => getNavStatus(v.navStatus)) },
    { label: 'Speed (SOG)', values: vessels.map(v => v.sog !== undefined ? `<strong>${v.sog.toFixed(1)}</strong> kn` : '--') },
    { label: 'Course (COG)', values: vessels.map(v => v.cog !== undefined ? v.cog.toFixed(1) + '°' : '--') },
    { label: 'Dimensions',  values: vessels.map(v => formatDimensions(v.dim)) },
    { label: 'Destination', values: vessels.map(v => v.destination || '<span style="color:var(--text-muted)">Unknown</span>') },
    { label: 'Callsign',    values: vessels.map(v => v.callsign || '--') },
    { label: 'IMO',         values: vessels.map(v => v.imo || '--') },
    { label: 'Last Update', values: vessels.map(v => v.updated ? new Date(v.updated).toLocaleTimeString() : '--') },
  ];

  panel.innerHTML = `
    <div class="compare-panel-header">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">Vessel Comparison — ${vessels.length} vessels</span>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" id="close-compare-panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="compare-grid" style="grid-template-columns:${gridCols}">
      ${rows.map(row => `
        <div class="compare-row" style="grid-column:1 / -1;display:grid;grid-template-columns:${gridCols}">
          <div class="compare-label">${row.label}</div>
          ${row.values.map(val => `<div class="compare-cell">${val}</div>`).join('')}
        </div>
      `).join('')}
    </div>
  `;

  panel.classList.add('open');

  document.getElementById('close-compare-panel')?.addEventListener('click', () => {
    panel.classList.remove('open');
  });
}