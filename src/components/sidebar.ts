// ============================================================
// SIDEBAR COMPONENT
// ============================================================

import { store } from '@/store';
import { router } from '@/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badgeKey?: 'alerts';
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/', label: 'Dashboard',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  },
  {
    path: '/shipments', label: 'Shipments',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  },
  {
    path: '/tracking', label: 'Live Tracking',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>`,
  },
  {
    path: '/fleet', label: 'Fleet',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V10l7-6 7 6v10"/><path d="M9 20v-5h6v5"/></svg>`,
  },
  {
    path: '/ports', label: 'Ports & Routes',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  {
    path: '/documents', label: 'Documents',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  },
  {
    path: '/alerts', label: 'Alerts',
    badgeKey: 'alerts',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  },
  {
    path: '/settings', label: 'Settings',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
];

export function renderSidebar(): void {
  const nav = document.getElementById('sidebar-nav');
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (!nav || !sidebar || !toggle) return;

  const state = store.getState();
  const currentPath = router.getCurrentPath();
  const unreadAlerts = state.alerts.filter(a => !a.read).length;

  nav.innerHTML = `
    <div class="nav-section">
      <div class="nav-section-label">Navigation</div>
      ${NAV_ITEMS.slice(0, 6).map(item => renderNavLink(item, currentPath, unreadAlerts)).join('')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">System</div>
      ${NAV_ITEMS.slice(6).map(item => renderNavLink(item, currentPath, unreadAlerts)).join('')}
    </div>
  `;

  // Nav click handlers
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const path = (link as HTMLElement).dataset.path ?? '/';
      router.navigate(path);
    });
  });

  // Sidebar toggle
  toggle.onclick = () => {
    sidebar.classList.toggle('collapsed');
    store.setState({ ui: { sidebarCollapsed: sidebar.classList.contains('collapsed') } });
  };

  // Keep active state in sync with route changes
  window.addEventListener('routechange', () => {
    nav.querySelectorAll('.nav-link').forEach(link => {
      const path = (link as HTMLElement).dataset.path;
      link.classList.toggle('active', path === router.getCurrentPath());
    });
  });
}

function renderNavLink(item: NavItem, currentPath: string, unreadAlerts: number): string {
  const badge = item.badgeKey === 'alerts' && unreadAlerts > 0
    ? `<span class="nav-badge">${unreadAlerts}</span>`
    : '';
  const active = currentPath === item.path ? 'active' : '';
  return `
    <div class="nav-link ${active}" data-path="${item.path}" role="button" tabindex="0"
         aria-label="${item.label}" aria-current="${active ? 'page' : 'false'}">
      ${item.icon}
      <span class="nav-link-label">${item.label}</span>
      ${badge}
    </div>
  `;
}
