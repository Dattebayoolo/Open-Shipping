// ============================================================
// TYPED REACTIVE STORE
// ============================================================

import type { AppState, StoreListener, Unsubscribe } from '@/types/state';

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

class Store {
  private state: AppState;
  private listeners: Set<StoreListener<AppState>> = new Set();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  setState(patch: DeepPartial<AppState>): void {
    this.state = this.deepMerge(this.state, patch) as AppState;
    this.notify();
  }

  subscribe(listener: StoreListener<AppState>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

export function initStore(initialState: AppState): Store {
  store = new Store(initialState);
  return store;
}
