// ============================================================
// RENDER CACHE — memoized computed values for hot render paths
// Prevents redundant recomputation on every store notification
// ============================================================

import { getShipTypeInfo, formatDimensions, getNavStatus } from './ship';
import type { ShipTypeInfo } from './ship';

// ── Ship type info cache (keyed by numeric type code) ────────────────────────
// AIS type codes are integers 0–99 — a tiny fixed-size cache
const typeInfoCache = new Map<number, ShipTypeInfo>();

export function cachedShipTypeInfo(type: number): ShipTypeInfo {
  if (typeInfoCache.has(type)) return typeInfoCache.get(type)!;
  const info = getShipTypeInfo(type);
  typeInfoCache.set(type, info);
  return info;
}

// ── Nav status label cache (keyed by 0–15 status code) ───────────────────────
const navStatusCache = new Map<number, string>();

export function cachedNavStatus(status: number): string {
  if (navStatusCache.has(status)) return navStatusCache.get(status)!;
  const label = getNavStatus(status);
  navStatusCache.set(status, label);
  return label;
}

// ── Dimension string cache (keyed by MMSI) ───────────────────────────────────
// Dimension objects rarely change (ShipStaticData) so caching by MMSI is safe.
const dimCache = new Map<number, string>();

export function cachedDimensions(
  mmsi: number,
  dim: { A?: number; B?: number; C?: number; D?: number } | undefined
): string {
  if (dimCache.has(mmsi)) return dimCache.get(mmsi)!;
  const str = formatDimensions(dim);
  dimCache.set(mmsi, str);
  return str;
}

/** Call when a vessel's static data is updated to invalidate its dim cache */
export function invalidateDimCache(mmsi: number): void {
  dimCache.delete(mmsi);
}

// ── Generic memoize (last-value cache for single-argument pure functions) ─────
export function memoize<TArg, TResult>(fn: (arg: TArg) => TResult): (arg: TArg) => TResult {
  const cache = new Map<TArg, TResult>();
  return (arg: TArg) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

// ── Relative time cache (5s TTL per timestamp) ───────────────────────────────
// relativeTime() calls Date.now() which is cheap, but called for every row
// on every 2s render — cache results for 5 seconds per unique Date reference.
const relTimeCache = new WeakMap<Date, { value: string; expiresAt: number }>();

export function cachedRelativeTime(date: Date): string {
  const cached = relTimeCache.get(date);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const diff = Date.now() - date.getTime();
  const sec  = Math.floor(diff / 1000);
  let value: string;
  if (sec < 60)       value = 'Just now';
  else if (sec < 3600) value = `${Math.floor(sec / 60)}m ago`;
  else                 value = `${Math.floor(sec / 3600)}h ago`;

  relTimeCache.set(date, { value, expiresAt: Date.now() + 5000 });
  return value;
}

// ── Throttle helper ──────────────────────────────────────────────────────────
// Use to prevent a callback from firing more than once per `wait` ms.
// Example: throttle(renderTable, 500) for event-driven renders.
export function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T;
}

// ── Debounce helper ──────────────────────────────────────────────────────────
// Delays execution until `wait` ms have elapsed since the last call.
export function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  } as T;
}
