// ============================================================
// DASHBOARD PAGE (LIVE AIS ENABLED)
// ============================================================

import { store } from '@/store';
import { router } from '@/router';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let typeChart: Chart | null = null;
let statusChart: Chart | null = null;
let dashboardInterval: any = null;

function getShipTypeLabel(type: number): string {
  if (type >= 70 && type <= 79) return 'Cargo';
  if (type >= 80 && type <= 89) return 'Tanker';
  if (type >= 60 && type <= 69) return 'Passenger';
  if (type >= 30 && type <= 39) return 'Fishing';
  if (type >= 40 && type <= 49) return 'High Speed';
  if (type >= 50 && type <= 59) return 'Special Craft';
  return 'Other';
}

function getNavStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: 'Under Way', 1: 'At Anchor', 2: 'Not Command',
    3: 'Restricted', 4: 'Constrained', 5: 'Moored',
    6: 'Aground', 7: 'Fishing', 8: 'Sailing',
  };
  return map[status] || 'Unknown';
}

export function renderDashboard(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  if (dashboardInterval) clearInterval(dashboardInterval);

  const state = store.getState();
  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#888' : '#888';

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header" style="margin-bottom:var(--space-4)">
        <div>
          <h2 class="page-heading">Global Fleet Overview</h2>
          <p class="page-subheading" style="display:flex;align-items:center;gap:var(--space-2)">
            Live Telemetry Dashboard
            <span id="dash-ais-status" class="badge badge-neutral" style="font-size:10px">Waiting for data...</span>
          </p>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="grid-4" style="margin-bottom: var(--space-5)">
        <div class="kpi-card stagger-1">
          <div class="kpi-header">
            <span class="kpi-label">Tracked Vessels</span>
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
          </div>
          <div class="kpi-value" id="kpi-total">0</div>
          <div class="kpi-delta up">Live Stream Active</div>
        </div>

        <div class="kpi-card green stagger-2">
          <div class="kpi-header">
            <span class="kpi-label">Under Way (Active)</span>
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--accent-green)" id="kpi-active">0</div>
          <div class="kpi-delta up">Vessels currently moving</div>
        </div>

        <div class="kpi-card amber stagger-3">
          <div class="kpi-header">
            <span class="kpi-label">Average Fleet Speed</span>
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: var(--accent-amber)" id="kpi-speed">0.0 kn</div>
          <div class="kpi-delta up">Across all moving vessels</div>
        </div>

        <div class="kpi-card blue stagger-4">
          <div class="kpi-header">
            <span class="kpi-label">Top Destination</span>
            <div class="kpi-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
          </div>
          <div class="kpi-value" style="font-size: 18px; line-height: 1.2" id="kpi-dest">--</div>
          <div class="kpi-delta neutral">Most common route</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom: var(--space-5)">
        <div class="card stagger-1">
          <div class="card-header">
            <span class="card-title">Fleet Composition (Live)</span>
          </div>
          <div style="position:relative;height:220px;">
            <canvas id="type-chart"></canvas>
          </div>
        </div>
        <div class="card stagger-2">
          <div class="card-header">
            <span class="card-title">Navigational Status</span>
          </div>
          <div style="position:relative;height:220px;">
            <canvas id="nav-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeChart) { typeChart.destroy(); typeChart = null; }
  if (statusChart) { statusChart.destroy(); statusChart = null; }

  const typeCtx = (document.getElementById('type-chart') as HTMLCanvasElement)?.getContext('2d');
  if (typeCtx) {
    typeChart = new Chart(typeCtx, {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#94a3b8'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor } } }, cutout: '70%' }
    });
  }

  const navCtx = (document.getElementById('nav-chart') as HTMLCanvasElement)?.getContext('2d');
  if (navCtx) {
    statusChart = new Chart(navCtx, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor } } } }
    });
  }

  updateDashboardData();
  dashboardInterval = setInterval(updateDashboardData, 3000);
}

function updateDashboardData() {
  const state = store.getState();
  const fleet = state.liveFleet || [];
  
  const statusEl = document.getElementById('dash-ais-status');
  if (statusEl) {
    statusEl.className = `badge ${state.aisStatus === 'live' ? 'badge-green' : 'badge-neutral'}`;
    statusEl.textContent = state.aisStatus === 'live' ? 'Live AIS Connected' : state.aisStatus;
  }

  if (!fleet.length) return;

  const total = fleet.length;
  const underWay = fleet.filter(s => s.navStatus === 0 || s.navStatus === 8);
  
  let speedSum = 0;
  let speedCount = 0;
  fleet.forEach(s => {
    if (s.sog !== undefined && s.sog > 0 && s.sog < 100) { speedSum += s.sog; speedCount++; }
  });
  const avgSpeed = speedCount ? (speedSum / speedCount).toFixed(1) : '0.0';

  const destMap: Record<string, number> = {};
  fleet.forEach(s => {
    if (s.destination && s.destination.trim()) {
      const d = s.destination.trim();
      destMap[d] = (destMap[d] || 0) + 1;
    }
  });
  const topDest = Object.entries(destMap).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('kpi-total')!.textContent = total.toString();
  document.getElementById('kpi-active')!.textContent = underWay.length.toString();
  document.getElementById('kpi-speed')!.textContent = `${avgSpeed} kn`;
  document.getElementById('kpi-dest')!.textContent = topDest ? topDest[0] : '--';

  // Update Charts
  if (typeChart) {
    const typeCount: Record<string, number> = {};
    fleet.forEach(s => { const l = getShipTypeLabel(s.type); typeCount[l] = (typeCount[l] || 0) + 1; });
    typeChart.data.labels = Object.keys(typeCount);
    typeChart.data.datasets[0].data = Object.values(typeCount);
    typeChart.update();
  }

  if (statusChart) {
    const navCount: Record<string, number> = {};
    fleet.forEach(s => { const l = getNavStatusLabel(s.navStatus); navCount[l] = (navCount[l] || 0) + 1; });
    // Sort by count
    const sortedNav = Object.entries(navCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    statusChart.data.labels = sortedNav.map(n => n[0]);
    statusChart.data.datasets[0].data = sortedNav.map(n => n[1]);
    statusChart.update();
  }
}
