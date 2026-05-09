// ============================================================
// ALERTS PAGE
// ============================================================

import { store } from '@/store';
import type { Alert, AlertSeverity } from '@/types/alert';

const SEVERITY_ICON: Record<AlertSeverity, string> = {
  critical: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

export function renderAlerts(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  const { alerts } = store.getState();
  const unread = alerts.filter(a => !a.read).length;
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const warning = alerts.filter(a => a.severity === 'warning').length;

  const sorted = [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const grouped: Record<AlertSeverity, Alert[]> = { critical: [], warning: [], info: [] };
  sorted.forEach(a => grouped[a.severity].push(a));

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Alert Center</h2>
          <p class="page-subheading">${unread} unread alerts</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="mark-all-read">Mark All Read</button>
          <select class="filter-select" id="alert-severity-filter">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>
      <div class="grid-3" style="margin-bottom:var(--space-5)">
        <div class="kpi-card red"><div class="kpi-header"><span class="kpi-label">Critical</span></div><div class="kpi-value" style="color:var(--accent-red)">${critical}</div></div>
        <div class="kpi-card amber"><div class="kpi-header"><span class="kpi-label">Warning</span></div><div class="kpi-value" style="color:var(--accent-amber)">${warning}</div></div>
        <div class="kpi-card"><div class="kpi-header"><span class="kpi-label">Info</span></div><div class="kpi-value">${alerts.filter(a => a.severity === 'info').length}</div></div>
      </div>
      <div id="alerts-container">
        ${(['critical', 'warning', 'info'] as AlertSeverity[]).map(sev => {
          const group = grouped[sev];
          if (!group.length) return '';
          const color = sev === 'critical' ? 'var(--accent-red)' : sev === 'warning' ? 'var(--accent-amber)' : 'var(--accent-blue)';
          const badgeCls = sev === 'critical' ? 'badge-red' : sev === 'warning' ? 'badge-amber' : 'badge-blue';
          return `
            <div style="margin-bottom:var(--space-5)">
              <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)">
                <span style="color:${color}">${SEVERITY_ICON[sev]}</span>
                <span style="font-size:var(--text-sm);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary)">${sev}</span>
                <span class="badge ${badgeCls}">${group.length}</span>
              </div>
              ${group.map((alert, i) => `
                <div class="alert-item ${sev} ${!alert.read ? 'unread' : ''} stagger-${Math.min(i+1,6)}" data-alert-id="${alert.id}">
                  <div class="alert-icon">${SEVERITY_ICON[sev]}</div>
                  <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-meta">
                      <span>${new Date(alert.timestamp).toLocaleString()}</span>
                      ${alert.shipmentId ? `<span>Shipment: <span style="font-family:var(--font-mono);font-size:10px">${alert.shipmentId}</span></span>` : ''}
                      ${alert.acknowledged ? '<span style="color:var(--accent-green)">✓ Acknowledged</span>' : ''}
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                    ${!alert.read ? `<button class="btn btn-ghost btn-sm mark-read" data-id="${alert.id}">Mark Read</button>` : ''}
                    ${!alert.acknowledged ? `<button class="btn btn-ghost btn-sm ack-alert" data-id="${alert.id}">Acknowledge</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>`;
        }).join('')}
      </div>
    </div>`;

  document.getElementById('mark-all-read')?.addEventListener('click', () => {
    store.setState({ alerts: store.getState().alerts.map(a => ({ ...a, read: true })) });
    renderAlerts();
  });
  document.querySelectorAll<HTMLElement>('.mark-read').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      store.setState({ alerts: store.getState().alerts.map(a => a.id === id ? { ...a, read: true } : a) });
      renderAlerts();
    });
  });
  document.querySelectorAll<HTMLElement>('.ack-alert').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      store.setState({ alerts: store.getState().alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) });
      renderAlerts();
    });
  });
  document.getElementById('alert-severity-filter')?.addEventListener('change', e => {
    const sev = (e.target as HTMLSelectElement).value;
    document.querySelectorAll<HTMLElement>('.alert-item').forEach(el => {
      el.style.display = sev === 'all' || el.classList.contains(sev) ? '' : 'none';
    });
  });
}
