// ============================================================
// MAIN ENTRY POINT — Open Shipping
// ============================================================

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/animations.css';

import { initStore, store } from '@/store';
import { router } from '@/router';
import { generateMockState } from '@/data/mock';
import { initAIS } from '@/data/ais';
import { renderSidebar } from '@/components/sidebar';
import { renderTopbar } from '@/components/topbar';
import { renderDashboard } from '@/pages/dashboard';
import { renderShipments } from '@/pages/shipments';
import { renderTracking } from '@/pages/tracking';
import { renderFleet } from '@/pages/fleet';
import { renderPorts } from '@/pages/ports';
import { renderDocuments } from '@/pages/documents';
import { renderAlerts } from '@/pages/alerts';
import { renderSettings } from '@/pages/settings';

// ── Bootstrap ─────────────────────────────────────────────────
function boot(): void {
  // 1. Initialize global state with mock data
  initStore(generateMockState());

  // 1.5 Start Live AIS Stream
  initAIS();

  // 2. Apply persisted theme immediately (no flash)
  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | 'system' | null;
  const theme = savedTheme ?? 'dark';
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // 3. Render shell components
  renderSidebar();
  renderTopbar();

  // 4. Register all routes
  router.register({ id: 'dashboard', path: '/', title: 'Dashboard', render: renderDashboard });
  router.register({ id: 'shipments', path: '/shipments', title: 'Shipments', render: renderShipments });
  router.register({ id: 'tracking', path: '/tracking', title: 'Live Tracking', render: renderTracking });
  router.register({ id: 'fleet', path: '/fleet', title: 'Fleet', render: renderFleet });
  router.register({ id: 'ports', path: '/ports', title: 'Ports & Routes', render: renderPorts });
  router.register({ id: 'documents', path: '/documents', title: 'Documents', render: renderDocuments });
  router.register({ id: 'alerts', path: '/alerts', title: 'Alert Center', render: renderAlerts });
  router.register({ id: 'settings', path: '/settings', title: 'Settings', render: renderSettings });

  // 5. Start router (resolves current hash → renders first page)
  router.start();

  // 6. Simulate live data updates every 45s
  setInterval(simulateLiveUpdate, 45_000);
}

// ── Live data simulation ───────────────────────────────────────
function simulateLiveUpdate(): void {
  const state = store.getState();
  const randomShipment = state.shipments[Math.floor(Math.random() * state.shipments.length)];
  const newAlert = {
    id: `ALT-LIVE-${Date.now()}`,
    shipmentId: randomShipment?.id ?? null,
    type: 'delay_detected' as const,
    severity: 'warning' as const,
    title: 'Live Update',
    message: 'Minor delay detected on inbound vessel ETA.',
    timestamp: new Date().toISOString(),
    read: false,
    acknowledged: false,
  };
  store.setState({ alerts: [newAlert, ...state.alerts] });
  renderSidebar();
}

// ── Keyboard shortcuts ─────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Ctrl/Cmd + K → Focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    (document.getElementById('global-search') as HTMLInputElement | null)?.focus();
  }

  // ? → Show keyboard shortcuts cheat sheet
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showCheatSheet();
  }

  // Escape → Close drawers/modals
  if (e.key === 'Escape') {
    document.getElementById('shipment-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.add('hidden');
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.getElementById('modal-container')?.classList.add('hidden');
    // Close cheat sheet if open
    document.getElementById('cheat-sheet-overlay')?.classList.add('hidden');
  }

  // G+D → Dashboard, G+T → Tracking, G+F → Fleet
  if (e.key === 'g' || e.key === 'G') {
    // Wait for next key
    const handler = (e2: KeyboardEvent) => {
      document.removeEventListener('keydown', handler);
      const navMap: Record<string, string> = {
        'd': '/', 't': '/tracking', 'f': '/fleet',
        'p': '/ports', 's': '/shipments', 'a': '/alerts',
      };
      const path = navMap[e2.key.toLowerCase()];
      if (path) router.navigate(path);
    };
    document.addEventListener('keydown', handler);
  }

  // R → Refresh (simulate refresh)
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    const btn = document.getElementById('refresh-btn');
    if (btn) {
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform 0.5s ease';
      setTimeout(() => { btn.style.transform = ''; }, 500);
    }
  }
});

// ── Keyboard Shortcuts Cheat Sheet ─────────────────────────────
function showCheatSheet(): void {
  // Remove existing overlay if already open
  const existing = document.getElementById('cheat-sheet-overlay');
  if (existing) {
    existing.classList.toggle('hidden');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'cheat-sheet-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 style="font-size:var(--text-base);font-weight:var(--weight-semibold);color:var(--text-primary)">Keyboard Shortcuts</h3>
        <button class="btn btn-ghost btn-icon btn-sm" id="cheat-sheet-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="shortcut-grid">
          <span class="shortcut-key">G then D</span>
          <span class="shortcut-desc">Go to Dashboard</span>
          <span class="shortcut-key">G then T</span>
          <span class="shortcut-desc">Go to Live Tracking</span>
          <span class="shortcut-key">G then F</span>
          <span class="shortcut-desc">Go to Fleet</span>
          <span class="shortcut-key">G then P</span>
          <span class="shortcut-desc">Go to Ports & Routes</span>
          <span class="shortcut-key">G then S</span>
          <span class="shortcut-desc">Go to Shipments</span>
          <span class="shortcut-key">G then A</span>
          <span class="shortcut-desc">Go to Alert Center</span>
          <span class="shortcut-key">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K</span>
          <span class="shortcut-desc">Focus global search</span>
          <span class="shortcut-key">R</span>
          <span class="shortcut-desc">Refresh data</span>
          <span class="shortcut-key">Esc</span>
          <span class="shortcut-desc">Close drawers / modals</span>
          <span class="shortcut-key">?</span>
          <span class="shortcut-desc">Show this cheat sheet</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
  document.getElementById('cheat-sheet-close')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

// ── Init ──────────────────────────────────────────────────────
boot();