// ============================================================
// PORTS & ROUTES PAGE
// ============================================================

import { store } from '@/store';
import type { CongestionLevel } from '@/types/port';
import { Chart, registerables } from 'chart.js';
import { fetchCurrentWeather } from '@/services/weather';
Chart.register(...registerables);

const CONGESTION_BADGE: Record<CongestionLevel, string> = {
  low: 'badge-green', medium: 'badge-amber', high: 'badge-red', critical: 'badge-red',
};
const FLAG_EMOJI: Record<string, string> = {
  CN: '🇨🇳', SG: '🇸🇬', NL: '🇳🇱', US: '🇺🇸', AE: '🇦🇪', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', KR: '🇰🇷',
};

// Weather Cache
let weatherCache: Record<string, { temp: number; wind: number; code: number; isDay: number }> | null = null;

let routeChart: Chart | null = null;

// WMO Weather interpretation codes
const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌧️' },
  53: { label: 'Moderate drizzle', icon: '🌧️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌦️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Slight rain showers', icon: '🌦️' },
  81: { label: 'Moderate rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Heavy thunderstorm with hail', icon: '⛈️' },
};

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

      <!-- Weather at Ports Cards -->
      <div style="margin-bottom:var(--space-5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <h3 style="font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">Current Weather at Hubs</h3>
          <span id="weather-status" style="font-size:10px;color:var(--text-muted)">Fetching live data (Open-Meteo)...</span>
        </div>
        <div id="weather-cards-container" style="display:flex;gap:var(--space-4);overflow-x:auto;padding-bottom:var(--space-2);scrollbar-width:none">
          <!-- Skeleton loaders -->
          ${Array(5).fill(0).map(() => `
            <div class="card" style="min-width:200px;flex-shrink:0;opacity:0.6">
              <div class="skeleton" style="height:14px;width:100px;margin-bottom:8px"></div>
              <div class="skeleton" style="height:24px;width:140px;margin-bottom:16px"></div>
              <div class="skeleton" style="height:32px;width:60px"></div>
            </div>
          `).join('')}
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

  fetchWeather();

  async function fetchWeather() {
    const container = document.getElementById('weather-cards-container');
    const status = document.getElementById('weather-status');
    if (!container || !status) return;

    if (weatherCache) {
      renderWeatherCards(container);
      status.textContent = 'Live Data Active';
      return;
    }

    try {
      const coords = ports.map(p => p.coords as [number, number]);
      const results = await fetchCurrentWeather(coords);
      
      weatherCache = {};
      results.forEach((w, i) => {
        weatherCache![ports[i].id] = w;
      });

      status.textContent = 'Live Data Active';
      renderWeatherCards(container);
    } catch (err) {
      console.error(err);
      status.textContent = 'Weather Unavailable';
      container.innerHTML = '<p class="text-muted" style="font-size:12px">Could not load weather data.</p>';
    }
  }

  function renderWeatherCards(container: HTMLElement) {
    if (!weatherCache) return;
    
    // Sort ports by most congested or randomly select top 8 to display as cards
    const displayPorts = ports.slice(0, 8);
    
    container.innerHTML = displayPorts.map(p => {
      const w = weatherCache![p.id];
      if (!w) return '';
      
      const wmo = WMO_CODES[w.code] || { label: 'Unknown', icon: '❓' };
      const icon = w.isDay === 0 && w.code <= 2 ? '🌙' : wmo.icon; // night icon for clear skies

      return `
        <div class="card card-hover" style="min-width:220px;flex-shrink:0;padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:var(--weight-semibold);color:var(--text-primary);font-size:var(--text-sm)">${p.name}</div>
              <div style="font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${p.locode}</div>
            </div>
            <div style="font-size:24px;line-height:1">${icon}</div>
          </div>
          
          <div style="display:flex;align-items:baseline;gap:var(--space-2);margin-top:var(--space-2)">
            <div style="font-size:24px;font-weight:700;letter-spacing:-0.05em">${w.temp}°C</div>
            <div style="font-size:11px;color:var(--text-secondary)">${wmo.label}</div>
          </div>
          
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
            <div>Wind: ${w.wind} km/h</div>
            <div style="display:flex;align-items:center;gap:4px">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.congestion === 'critical' ? 'var(--accent-red)' : p.congestion === 'high' ? 'var(--accent-amber)' : 'var(--accent-green)'}"></span>
              ${p.congestion.toUpperCase()}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}
