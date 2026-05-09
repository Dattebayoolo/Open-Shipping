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
  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
  document.documentElement.setAttribute('data-theme', savedTheme ?? 'dark');

  // 3. Render shell components
  renderSidebar();
  renderTopbar();

  // 4. Register all routes
  router.register({ id: 'dashboard',  path: '/',          title: 'Dashboard',      render: renderDashboard });
  router.register({ id: 'shipments',  path: '/shipments', title: 'Shipments',      render: renderShipments });
  router.register({ id: 'tracking',   path: '/tracking',  title: 'Live Tracking',  render: renderTracking  });
  router.register({ id: 'fleet',      path: '/fleet',     title: 'Fleet',          render: renderFleet     });
  router.register({ id: 'ports',      path: '/ports',     title: 'Ports & Routes', render: renderPorts     });
  router.register({ id: 'documents',  path: '/documents', title: 'Documents',      render: renderDocuments });
  router.register({ id: 'alerts',     path: '/alerts',    title: 'Alert Center',   render: renderAlerts    });
  router.register({ id: 'settings',   path: '/settings',  title: 'Settings',       render: renderSettings  });

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    (document.getElementById('global-search') as HTMLInputElement | null)?.focus();
  }
  if (e.key === 'Escape') {
    document.getElementById('shipment-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.add('hidden');
    document.getElementById('modal-overlay')?.classList.add('hidden');
    document.getElementById('modal-container')?.classList.add('hidden');
  }
});

// ── Init ──────────────────────────────────────────────────────
boot();
