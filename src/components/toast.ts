// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

export type ToastType = 'success' | 'warning' | 'critical' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

// Keep a set of recently shown toast IDs to avoid duplicates
const shownToasts = new Set<string>();
let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(toast: Toast, durationMs = 5000): void {
  // Deduplicate — don't show the same alert twice within 5 minutes
  if (shownToasts.has(toast.id)) return;
  shownToasts.add(toast.id);
  setTimeout(() => shownToasts.delete(toast.id), 5 * 60 * 1000);

  const c = getContainer();

  const colors: Record<ToastType, { border: string; icon: string; bg: string }> = {
    success:  { border: 'var(--accent-green)',  icon: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
    warning:  { border: 'var(--accent-amber)',  icon: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    critical: { border: 'var(--accent-red)',    icon: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    info:     { border: 'var(--accent-blue)',   icon: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  };

  const icons: Record<ToastType, string> = {
    success:  '<polyline points="20 6 9 17 4 12"/>',
    warning:  '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    critical: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info:     '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  };

  const { border, icon, bg } = colors[toast.type];
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.id = `toast-${toast.id}`;
  el.style.cssText = `
    display:flex;align-items:flex-start;gap:12px;
    background:var(--bg-surface);
    border:1px solid var(--border);
    border-left:3px solid ${border};
    border-radius:var(--radius-lg);
    padding:12px 14px;
    box-shadow:var(--shadow-lg);
    pointer-events:auto;
    max-width:340px;
    animation:toastIn 300ms cubic-bezier(0.16,1,0.3,1) both;
    position:relative;
  `;

  el.innerHTML = `
    <div style="width:32px;height:32px;border-radius:var(--radius-md);background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${icon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${icons[toast.type]}
      </svg>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px;">${toast.title}</div>
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.4;">${toast.message}</div>
      ${toast.action ? `<button class="toast-action-btn" style="margin-top:6px;font-size:11px;color:${icon};background:none;border:none;cursor:pointer;padding:0;font-weight:600;">${toast.action.label}</button>` : ''}
    </div>
    <button class="toast-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0;flex-shrink:0;line-height:1;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast-progress" style="position:absolute;bottom:0;left:0;height:2px;background:${border};opacity:0.4;border-radius:0 0 var(--radius-lg) var(--radius-lg);animation:toastProgress ${durationMs}ms linear both;"></div>
  `;

  const dismissFn = () => {
    el.style.animation = 'toastOut 200ms ease both';
    setTimeout(() => el.remove(), 200);
  };

  el.querySelector('.toast-close')?.addEventListener('click', dismissFn);
  if (toast.action) {
    el.querySelector('.toast-action-btn')?.addEventListener('click', () => {
      toast.action!.onClick();
      dismissFn();
    });
  }

  c.appendChild(el);

  // Auto-dismiss
  setTimeout(dismissFn, durationMs);
}

// ── Watch the store for new unread critical/warning alerts → show toasts ──
let lastAlertCount = 0;
let pushPermissionRequested = false;

function requestPushPermission() {
  if (pushPermissionRequested) return;
  pushPermissionRequested = true;
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(console.warn);
  }
}

function sendPushNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export function initToastWatcher(store: { getState: () => any; subscribe: (cb: (s: any) => void) => void }): void {
  // Request push permission immediately when initializing the watcher
  requestPushPermission();

  store.subscribe((state) => {
    const alerts = state.alerts || [];
    const newAlerts = alerts.slice(0, Math.max(0, alerts.length - lastAlertCount));
    lastAlertCount = alerts.length;

    newAlerts.filter((a: any) => !a.read).forEach((a: any) => {
      // Show UI Toast
      showToast({
        id: a.id,
        type: (a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info') as ToastType,
        title: a.title,
        message: a.message,
      });

      // Send Browser Push Notification for critical/warning
      if (a.severity === 'critical' || a.severity === 'warning') {
        sendPushNotification(a.title, { body: a.message, icon: '/favicon.ico' });
      }
    });
  });
}
