// ============================================================
// PORTS & ROUTES PAGE
// ============================================================

import { store } from '@/store';
import type { CongestionLevel } from '@/types/port';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const CONGESTION_BADGE: Record<CongestionLevel, string> = {
  low: 'badge-green', medium: 'badge-amber', high: 'badge-red', critical: 'badge-red',
};
const FLAG_EMOJI: Record<string, string> = {
  CN: '🇨🇳', SG: '🇸🇬', NL: '🇳🇱', US: '🇺🇸', AE: '🇦🇪', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', KR: '🇰🇷',
};

let routeChart: Chart | null = null;

export function renderPorts(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  const { ports, routes } = store.getState();
  const isDark = store.getState().theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const textColor = '#888';

  const firstRoute = routes[0];

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Ports & Routes</h2>
          <p class="page-subheading">Port congestion status and route analytics</p>
        </div>
      </div>

      <!-- Port table -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-header">
          <span class="card-title">Port Status</span>
          <span class="badge badge-neutral">${ports.length} ports</span>
        </div>
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Port</th><th>Country</th><th>Congestion</th>
                <th>Avg Dwell</th><th>Open Berths</th><th>Current Vessels</th><th>Weather</th>
              </tr>
            </thead>
            <tbody>
              ${ports.map(port => `
                <tr>
                  <td>
                    <div style="font-weight:var(--weight-medium)">${port.name}</div>
                    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${port.locode}</div>
                  </td>
                  <td>${FLAG_EMOJI[port.country] ?? ''} ${port.country}</td>
                  <td><span class="badge ${CONGESTION_BADGE[port.congestion]}">${port.congestion.toUpperCase()}</span></td>
                  <td style="color:var(--text-secondary)">${port.avgDwellTime} days</td>
                  <td>
                    <span style="color:${port.openBerths <= 2 ? 'var(--accent-red)' : 'var(--text-primary)'}">
                      ${port.openBerths}/${port.totalBerths}
                    </span>
                  </td>
                  <td style="color:var(--text-secondary)">${port.currentVessels}</td>
                  <td style="color:var(--accent-amber);font-size:var(--text-xs)">${port.weatherAlert ?? '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Route Analytics -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Transit Time Trend</span>
            <select class="filter-select" id="route-selector" style="height:28px;font-size:11px">
              ${routes.map(r => `<option value="${r.id}">${r.origin} → ${r.destination}</option>`).join('')}
            </select>
          </div>
          <div style="position:relative;height:220px;">
            <canvas id="route-chart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Route Summary</span>
          </div>
          <div id="route-summary" style="display:flex;flex-direction:column;gap:var(--space-3)">
            ${firstRoute ? renderRouteSummary(firstRoute) : '<p class="text-muted">No routes available</p>'}
          </div>
        </div>
      </div>
    </div>
  `;

  if (routeChart) { routeChart.destroy(); routeChart = null; }

  function renderRouteChart(routeId: string): void {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    if (routeChart) { routeChart.destroy(); routeChart = null; }

    const ctx = (document.getElementById('route-chart') as HTMLCanvasElement)?.getContext('2d');
    if (!ctx) return;

    routeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: route.history.map(h => h.month),
        datasets: [
          {
            label: 'Transit Days',
            data: route.history.map(h => h.transitDays),
            borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.07)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
          },
          {
            label: 'Cost/kg (USD)',
            data: route.history.map(h => h.costPerKg),
            borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.07)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, font: { size: 11, family: 'Inter' } } } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => `${v}d` }, position: 'left' },
          y1: { ticks: { color: '#3b82f6', font: { size: 11 }, callback: v => `$${v}` }, position: 'right', grid: { display: false } },
        },
      },
    });

    const summary = document.getElementById('route-summary');
    if (summary) summary.innerHTML = renderRouteSummary(route);
  }

  function renderRouteSummary(route: typeof routes[0]): string {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        ${[
          ['Route', `${route.origin} → ${route.destination}`],
          ['Carrier', route.carrier],
          ['Avg Transit', `${route.avgTransitDays} days`],
          ['Cost per kg', `$${route.costPerKg.toFixed(2)}`],
          ['On-Time Rate', `${route.onTimeRate}%`],
        ].map(([k, v]) => `
          <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">${k}</div>
            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);color:var(--text-primary)">${v}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Init chart
  if (routes.length) renderRouteChart(routes[0].id);

  document.getElementById('route-selector')?.addEventListener('change', (e) => {
    renderRouteChart((e.target as HTMLSelectElement).value);
  });
}
