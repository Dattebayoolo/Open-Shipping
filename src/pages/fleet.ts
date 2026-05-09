// ============================================================
// FLEET PAGE (LIVE AIS ENABLED)
// ============================================================

import { store } from '@/store';

const TYPE_EMOJI: Record<string, string> = {
  Cargo: '🚢', Tanker: '⛽', Passenger: '🛳️', Fishing: '🎣', 'High Speed': '🚤', 'Special Craft': '🛥️', Other: '⚓'
};

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
    0: 'Under way', 1: 'At anchor', 2: 'Not under command',
    3: 'Restricted', 4: 'Constrained', 5: 'Moored',
    6: 'Aground', 7: 'Fishing', 8: 'Sailing',
  };
  return map[status] || 'Unknown';
}

function generateRandomUtilization(mmsi: number): number {
  // Deterministic random based on MMSI
  return 40 + ((mmsi * 13) % 60);
}

let viewMode: 'grid' | 'table' = 'grid';
let unsubscribe: (() => void) | null = null;
let currentFleet: any[] = [];

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
          
          let dims = '--';
          if (v.dim && (v.dim.A || v.dim.B)) dims = `${v.dim.A + v.dim.B}m`;

          return `
            <div class="fleet-card stagger-${Math.min(i + 1, 6)}">
              <div class="fleet-card-header">
                <div class="vessel-icon">${TYPE_EMOJI[typeInfo.label] ?? '🚢'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.name}">${v.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted)">IMO: ${v.imo || '--'} · ${typeInfo.label}</div>
                </div>
                <span class="badge badge-neutral" style="background:${typeInfo.color}20;color:${typeInfo.color};border-color:${typeInfo.color}40">${getNavStatus(v.navStatus)}</span>
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
  } else {
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vessel</th><th>Type</th><th>MMSI / Callsign</th><th>Status</th>
              <th>Speed</th><th>Destination</th><th>Length</th>
            </tr>
          </thead>
          <tbody>
            ${currentFleet.map(v => {
              const typeInfo = getShipTypeInfo(v.type);
              let dims = '--';
              if (v.dim && (v.dim.A || v.dim.B)) dims = `${v.dim.A + v.dim.B}m`;
              return `
                <tr>
                  <td style="font-weight:var(--weight-medium);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v.name}">${v.name}</td>
                  <td><span class="mode-badge">${TYPE_EMOJI[typeInfo.label] ?? '🚢'} ${typeInfo.label}</span></td>
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
  }
}
