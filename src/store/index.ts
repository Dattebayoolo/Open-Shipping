// ============================================================
// TYPED REACTIVE STORE — with rAF-batched notifications
// ============================================================

import type { AppState, StoreListener, Unsubscribe } from '@/types/state';
import type { LiveVessel } from '@/types/live-vessel';

export type Middleware = (state: AppState, patch: any, next: () => void) => void;

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

class Store {
  private state: AppState;
  private listeners: Set<StoreListener<AppState>> = new Set();
  private middlewares: Middleware[] = [];

  // rAF batching — only one notify() scheduled per animation frame
  private rafPending = false;

  // Separate high-frequency fleet cache — avoids deepMerge on every AIS tick
  private pendingFleet: LiveVessel[] | null = null;

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * General state update — runs through middlewares, deep-merges patch, and schedules a batched notify.
   * Use for low-frequency updates (alerts, settings, theme, etc.)
   */
  setState(patch: DeepPartial<AppState>): void {
    const runMiddlewares = (index: number) => {
      if (index < this.middlewares.length) {
        this.middlewares[index](this.state, patch, () => runMiddlewares(index + 1));
      } else {
        this.state = this.deepMerge(this.state, patch) as AppState;
        this.scheduleNotify();
      }
    };
    runMiddlewares(0);
  }

  /**
   * High-frequency fleet update — skips deepMerge, replaces array directly.
   * Batched via rAF so the UI never updates faster than 60fps regardless
   * of how many AIS messages arrive per second.
   */
  setLiveFleet(fleet: LiveVessel[]): void {
    this.pendingFleet = fleet;
    this.scheduleNotify();
  }

  subscribe(listener: StoreListener<AppState>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Schedule a single rAF-coalesced notification — drops redundant frames */
  private scheduleNotify(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      // Flush any pending fleet update before notifying subscribers
      if (this.pendingFleet !== null) {
        this.state = { ...this.state, liveFleet: this.pendingFleet };
        this.pendingFleet = null;
      }
      this.notify();
    });
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.state));
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (Array.isArray(source)) return source;
    if (typeof source !== 'object' || source === null) return source;
    if (typeof target !== 'object' || target === null) return source;

    const result = { ...(target as Record<string, unknown>) };
    for (const key of Object.keys(source as Record<string, unknown>)) {
      const srcVal = (source as Record<string, unknown>)[key];
      const tgtVal = (target as Record<string, unknown>)[key];
      result[key] = this.deepMerge(tgtVal, srcVal);
    }
    return result;
  }
}

export let store: Store;

// ── Built-in Middlewares ────────────────────────────────────────

export const loggerMiddleware: Middleware = (_state, patch, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Store Update]', patch);
  }
  next();
};

export const persistenceMiddleware: Middleware = (_state, patch, next) => {
  next();
  // Persist important state
  if (patch.theme) localStorage.setItem('theme', patch.theme);
  if (patch.settings) localStorage.setItem('settings', JSON.stringify(patch.settings));
};

export function initStore(initialState: AppState): Store {
  store = new Store(initialState);
  store.use(loggerMiddleware);
  store.use(persistenceMiddleware);
  return store;
}
