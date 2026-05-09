// ============================================================
// SETTINGS PAGE
// ============================================================

import { store } from '@/store';

export function renderSettings(): void {
  const content = document.getElementById('page-content');
  if (!content) return;

  const { settings, theme } = store.getState();

  content.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-heading">Settings</h2>
          <p class="page-subheading">Customize your dashboard experience</p>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-section stagger-1">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-row">
          <div><div class="settings-label">Theme</div><div class="settings-desc">Choose between dark, light, or system preference</div></div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="dark-mode-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              Dark
            </button>
            <button class="btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="light-mode-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              Light
            </button>
            <button class="btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="system-mode-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              System
            </button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Map Style</div><div class="settings-desc">Default map tile layer</div></div>
          <select class="filter-select" id="map-style-select">
            <option value="dark" ${settings.mapStyle === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${settings.mapStyle === 'light' ? 'selected' : ''}>Light</option>
            <option value="satellite" ${settings.mapStyle === 'satellite' ? 'selected' : ''}>Satellite</option>
          </select>
        </div>
      </div>

      <!-- Regional -->
      <div class="settings-section stagger-2">
        <div class="settings-section-title">Regional</div>
        <div class="settings-row">
          <div><div class="settings-label">Date Format</div></div>
          <select class="filter-select" id="date-format-select">
            <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
            <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
            <option value="ISO" ${settings.dateFormat === 'ISO' ? 'selected' : ''}>ISO 8601</option>
          </select>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Currency</div></div>
          <select class="filter-select" id="currency-select">
            ${(['USD', 'EUR', 'GBP', 'AED'] as const).map(c =>
    `<option value="${c}" ${settings.currency === c ? 'selected' : ''}>${c}</option>`
  ).join('')}
          </select>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Units</div></div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn ${settings.units === 'metric' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="metric-btn">Metric</button>
            <button class="btn ${settings.units === 'imperial' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="imperial-btn">Imperial</button>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section stagger-3">
        <div class="settings-section-title">Notifications</div>
        ${Object.entries(settings.notifications).map(([key, enabled]) => `
          <div class="settings-row">
            <div><div class="settings-label">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div></div>
            <label class="toggle">
              <input type="checkbox" ${enabled ? 'checked' : ''} data-notif-key="${key}" class="notif-toggle" />
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
          </div>
        `).join('')}
      </div>

      <!-- API Keys -->
      <div class="settings-section stagger-4">
        <div class="settings-section-title">API Keys</div>
        <div class="settings-row">
          <div>
            <div class="settings-label">AISStream API Key</div>
            <div class="settings-desc">Used for real-time vessel tracking on the Live Tracking page. <a href="https://aisstream.io" target="_blank" style="color:var(--accent-blue)">Get a free key</a></div>
          </div>
          <div style="display:flex;gap:var(--space-2);align-items:center">
            <input type="password" id="ais-api-key" value="${settings.apiKeys.aisstream || ''}" placeholder="Enter your API key…" style="width:220px;font-family:var(--font-mono);font-size:11px" />
            <button class="btn btn-primary btn-sm" id="save-ais-key-btn">Save</button>
            <span id="ais-key-status" style="font-size:11px;color:var(--text-muted)"></span>
          </div>
        </div>
      </div>

      <!-- Account -->
      <div class="settings-section stagger-5">
        <div class="settings-section-title">Account</div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Kaza Mahmood</div>
            <div class="settings-desc">Logistics Administrator</div>
          </div>
          <span class="badge badge-green">Active</span>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Version</div></div>
          <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-muted)">v1.0.0</span>
        </div>
      </div>
    </div>
  `;

  // AIS API Key save handler
  const aisKeyInput = document.getElementById('ais-api-key') as HTMLInputElement;
  const aisKeyStatus = document.getElementById('ais-key-status');
  document.getElementById('save-ais-key-btn')?.addEventListener('click', () => {
    const key = aisKeyInput.value.trim();
    const apiKeys = { ...store.getState().settings.apiKeys, aisstream: key };
    store.setState({ settings: { ...store.getState().settings, apiKeys } });
    if (aisKeyStatus) {
      aisKeyStatus.textContent = key ? '✓ Saved' : '✓ Cleared';
      aisKeyStatus.style.color = 'var(--accent-green)';
      setTimeout(() => { if (aisKeyStatus) aisKeyStatus.textContent = ''; }, 2000);
    }
  });

  const setTheme = (t: 'dark' | 'light' | 'system') => {
    let resolvedTheme: 'dark' | 'light';
    if (t === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolvedTheme = t;
    }
    store.setState({ theme: t });
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', t);
    renderSettings();
  };

  document.getElementById('dark-mode-btn')?.addEventListener('click', () => setTheme('dark'));
  document.getElementById('light-mode-btn')?.addEventListener('click', () => setTheme('light'));
  document.getElementById('system-mode-btn')?.addEventListener('click', () => setTheme('system'));
  document.getElementById('metric-btn')?.addEventListener('click', () => {
    store.setState({ settings: { ...store.getState().settings, units: 'metric' } });
    renderSettings();
  });
  document.getElementById('imperial-btn')?.addEventListener('click', () => {
    store.setState({ settings: { ...store.getState().settings, units: 'imperial' } });
    renderSettings();
  });
  document.getElementById('map-style-select')?.addEventListener('change', e => {
    const val = (e.target as HTMLSelectElement).value as 'dark' | 'light' | 'satellite';
    store.setState({ settings: { ...store.getState().settings, mapStyle: val } });
  });
  document.getElementById('date-format-select')?.addEventListener('change', e => {
    const val = (e.target as HTMLSelectElement).value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO';
    store.setState({ settings: { ...store.getState().settings, dateFormat: val } });
  });
  document.getElementById('currency-select')?.addEventListener('change', e => {
    const val = (e.target as HTMLSelectElement).value as 'USD' | 'EUR' | 'GBP' | 'AED';
    store.setState({ settings: { ...store.getState().settings, currency: val } });
  });
  document.querySelectorAll<HTMLInputElement>('.notif-toggle').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.notifKey!;
      const notifs = { ...store.getState().settings.notifications, [key]: input.checked };
      store.setState({ settings: { ...store.getState().settings, notifications: notifs } });
    });
  });
}