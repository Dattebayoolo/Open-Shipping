// ============================================================
// TOPBAR COMPONENT
// ============================================================

import { store } from '@/store';
import { router } from '@/router';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/shipments': 'Shipments',
  '/tracking': 'Live Tracking',
  '/fleet': 'Fleet Management',
  '/ports': 'Ports & Routes',
  '/documents': 'Documents',
  '/alerts': 'Alert Center',
  '/settings': 'Settings',
};

export function renderTopbar(): void {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  const state = store.getState();
  const title = PAGE_TITLES[router.getCurrentPath()] ?? 'Open Shipping';
  const unread = state.alerts.filter(a => !a.read).length;
  const isDark = state.theme === 'dark';

  topbar.innerHTML = `
    <div class="topbar-left">
      <h1 class="page-title">${title}</h1>
      <div class="topbar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="global-search" type="text" placeholder="Search shipments, routes…" aria-label="Global search" />
      </div>
    </div>
    <div class="topbar-right">
      <button id="theme-toggle" class="topbar-btn" aria-label="Toggle theme" data-tooltip="${isDark ? 'Light mode' : 'Dark mode'}">
        ${isDark
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
        }
      </button>
      <button id="alerts-btn" class="topbar-btn" aria-label="View alerts" data-tooltip="Alerts">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        ${unread > 0 ? '<span class="topbar-alert-dot"></span>' : ''}
      </button>
      <button id="refresh-btn" class="topbar-btn" aria-label="Refresh data" data-tooltip="Refresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  `;

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const newTheme = store.getState().theme === 'dark' ? 'light' : 'dark';
    store.setState({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    renderTopbar(); // re-render for icon swap
  });

  // Alerts nav
  document.getElementById('alerts-btn')?.addEventListener('click', () => {
    router.navigate('/alerts');
  });

  // Refresh
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('refresh-btn');
    if (btn) {
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform 0.5s ease';
      setTimeout(() => { btn.style.transform = ''; }, 500);
    }
  });

  // Update title on route change
  window.addEventListener('routechange', () => renderTopbar());
}
