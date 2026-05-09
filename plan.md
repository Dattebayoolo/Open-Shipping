# Open Shipping — Project Analysis & Improvement Roadmap

> **Analysis Date:** May 9, 2026
> **Codebase Scope:** Full TypeScript source (~4,200+ lines across 27 files)

---

## 🎯 Priority 1: Critical Technical Debt

### 1. Type Safety — Convert `any[]` to Proper Types
- **File:** `src/types/state.ts` line 36: `liveFleet: any[]`
- **Impact:** Loses type safety across all pages consuming live fleet data (dashboard, tracking, fleet, shipments)
- **Fix:** Create a proper `LiveVessel` interface with all AIS fields (MMSI, name, lat, lng, sog, cog, heading, navStatus, type, destination, callsign, imo, dim, eta, updated)

### 2. Missing Test Infrastructure
- **Status:** Zero tests across the entire project
- **Missing:** No testing framework in `package.json` (no vitest, jest, or playwright)
- **Recommendation:** Add Vitest for unit tests on store, router, and utility functions

### 3. ESLint Not Configured
- `package.json` references `"lint": "eslint src --ext ts"` but no `.eslintrc` file exists — the lint command will fail

### 4. Memory Leak — Interval Cleanup
- **`src/pages/dashboard.ts`:** `dashboardInterval` is never cleared when navigating away from dashboard
- **`src/main.ts`:** `simulateLiveUpdate` interval runs forever with no cleanup mechanism
- **Intermittent intervals** (tracking.ts, fleet.ts, shipments.ts store.subscribe) — no unsubscribe cleanup on page navigation

### 5. Duplicate Code — Ship Type / Nav Status Helpers
- **`getShipTypeInfo()`** is duplicated verbatim in `tracking.ts`, `fleet.ts`, and `shipments.ts`
- **`getNavStatus()`** is duplicated in `fleet.ts` and `shipments.ts`
- **`getShipTypeLabel()`** is a separate variant in `dashboard.ts`
- **Fix:** Extract to a shared `src/utils/ship.ts` utility module

---

## 🚀 Priority 2: High-Impact Features

### 6. Vessel Track History on Map
- **Current:** Tracking map only shows current position markers
- **Feature:** Draw polyline history trails showing vessel path over last N minutes
- **Benefit:** Visualize movement patterns, detect route deviations for alerts
- **Effort:** Medium — store N previous positions per vessel, draw Leaflet polylines

### 7. Weather Overlay Layer
- **Port data already has `weatherAlert` field** but no visual weather layer exists
- **Feature:** Add wind/storm overlay tiles to the tracking map
- **Integration:** Free APIs — OpenWeather tile layer or StormGlass API
- **Settings:** Add weather overlay toggle in settings page

### 8. Leaflet Marker Clustering
- **Current:** Thousands of markers pushed to map individually at zoom-out levels
- **Feature:** Integrate `leaflet.markercluster` for automatic marker clustering
- **Benefit:** Massive performance improvement with 1,000+ live vessels

### 9. Live Theme Sync for Map
- **Bug:** Tracking map tile layer is initialized once and never updates when user toggles theme in topbar/settings
- **Feature:** Subscribe to store `theme` changes and swap tile layer dynamically
- **Effort:** Low — add store subscription in tracking.ts

### 10. Browser Push Notifications
- **Settings page already has per-category notification toggles** but no implementation
- **Feature:** Use `Notification API` for critical alerts even when tab is backgrounded
- **Permission:** Request on first critical alert, show in topbar as badge

### 11. Toast Notification System
- **Current:** Alerts only visible in Alert Center or as sidebar badge number
- **Feature:** Toast popup system in top-right corner for real-time critical alerts
- **Behavior:** Auto-dismiss after 5s, click to navigate to alert
- **Effort:** Low-Medium — create `components/toast.ts`

### 12. Fleet Comparison Tool
- **Feature:** Select 2+ vessels in Fleet page and show side-by-side telemetry comparison
- **Display:** Compare speed, dimensions, destination, nav status, utilization

### 13. Port Congestion Heatmap
- **Port data has `coords` and `congestion`** — draw color-coded circles on tracking map
- **Colors:** Low=green, Medium=amber, High=red, Critical=deep-red
- **Effort:** Low — reuse existing port markers with different styling

### 14. On-Map ETA Prediction
- **Feature:** Calculate estimated arrival based on current SOG, COG, and destination lat/lng
- **Display:** Show ETA countdown on vessel detail popup and drawer
- **Effort:** Medium — Haversine distance + speed calculation

### 15. Shipment Timeline / Kanban View
- **Current:** Shipments page is tabular only
- **Feature:** Add toggleable timeline/kanban view showing lifecycle stages (pending → picked_up → in_transit → at_port → customs_hold → out_for_delivery → delivered)
- **Effort:** Medium — reuse existing shipment status types

---

## 🎨 Priority 3: UX & UI Polish

### 16. Keyboard Shortcuts Cheat Sheet
- **Current:** Only `Ctrl+K` (search focus) and `Escape` (close drawers) exist
- **Feature:** Press `?` to show a modal with all available shortcuts
- **Proposed shortcuts:** `G+D` dashboard, `G+T` tracking, `G+F` fleet, `N` new alert, `R` refresh

### 17. Map Full-Screen Mode
- **Feature:** Full-screen toggle button on tracking page for immersive map viewing
- **Uses:** Fullscreen API + expanded layout hiding sidebar

### 18. Pinned / Favorite Vessels
- **Feature:** Star/pin vessels to a "watch list" persisted in localStorage
- **Display:** Pinned vessels shown at top of fleet lists and sidebar panel

### 19. Multiple Export Formats
- **Current:** CSV export only (in shipments.ts)
- **Feature:** Add JSON, GeoJSON (for GIS tools), and PDF report export

### 20. Saved Filters & Views
- **Feature:** Save filter combinations on Fleet/Shipments pages with custom names
- **Persistence:** localStorage with named presets

### 21. Loading Skeletons & Improved Empty States
- **Current:** Flat "No data" / "Waiting..." messages
- **Feature:** Animated skeleton loaders matching card/grid shapes while AIS connects
- **Effort:** Low — pure CSS skeleton animations

### 22. Mobile Responsive Layout
- **Current:** Sidebar and grid assume desktop width (240px sidebar + content)
- **Feature:** Collapsed mobile nav, stacked grids, responsive typography
- **Target:** Tablet and mobile breakpoints at 768px and 480px

---

## ⚡ Priority 4: Performance

### 23. Virtual Scrolling for Fleet Table
- **Current:** Hard-capped at 100 rows with `slice(0, 100)`
- **Feature:** Virtual scrolling to handle thousands of vessels with constant DOM size
- **Library:** Write lightweight custom virtual scroller or use `clusterize.js`

### 24. Web Worker for AIS Data Processing
- **Current:** `liveShipsMap` operations on main thread (JSON parse + Map set on every message)
- **Feature:** Move AIS message parsing and map merging to a Web Worker
- **Benefit:** Eliminates UI jank during high-volume AIS data bursts

### 25. Debounced / requestAnimationFrame Store Updates
- **Current:** Store notifies all listeners on every `setState()` — could be 500+ updates/sec
- **Feature:** Batch store notifications with `requestAnimationFrame` or throttle at 30fps
- **Effort:** Medium — modify store's `notify()` method

### 26. Dynamic Import (Code Splitting) for Pages
- **Current:** All 8 page modules eagerly imported in `main.ts` — increases initial bundle
- **Feature:** Use `import()` dynamic imports when route resolves
- **Effort:** Low-Medium — modify router to accept lazy `() => import(...)` modules

---

## 🏗️ Priority 5: Architecture & Extensibility

### 27. Component Lifecycle System
- **Current:** Each page is a monolithic `render()` that replaces innerHTML
- **Feature:** Create a lightweight component base with `onMount()`, `onUnmount()`, `onUpdate()` lifecycle hooks
- **Benefit:** Clean up intervals/subscriptions automatically

### 28. Store Middleware Pipeline
- **Current:** Store is bare Pub/Sub with no hooks
- **Feature:** Add middleware chain for:
  - `persistMiddleware` — auto-save to localStorage
  - `loggerMiddleware` — dev console logging
  - `undoMiddleware` — state history for undo/redo

### 29. Service Layer for External APIs
- **Current:** AIS connection logic mixed with store updates in `data/ais.ts`
- **Feature:** Create dedicated service modules under `src/services/`:
  - `ais.service.ts` — WebSocket connection management
  - `weather.service.ts` — weather API integration
  - `ports.service.ts` — port schedule API
  - `customs.service.ts` — customs status API

### 30. CSS Module Scoping
- **Current:** All CSS is global — risk of class name collisions
- **Feature:** Convert to CSS Modules (`.module.css`) for component-scoped styles
- **Vite support:** Built-in — just rename files

---

## 🌐 Priority 6: Integrations & Ecosystem

### 31. Port Schedule API Integration
- **Feature:** Pull real port schedules from PortXChange, MarineTraffic, or Free Port API
- **Display:** Show upcoming vessel arrivals/departures per port

### 32. Customs Status Tracking
- **Feature:** Integrate with customs clearance APIs to auto-update document statuses
- **Workflow:** Submitted → In Review → Cleared → Released

### 33. Carbon Footprint Calculator
- **Feature:** Estimate CO₂ emissions per shipment/voyage
- **Formula:** Distance × fuel consumption × emission factor (vessel type dependent)
- **Display:** Show in shipment detail and fleet card

### 34. i18n / Multi-Language Support
- **Feature:** Add locale switching for global logistics teams
- **Framework:** Use `i18next` or lightweight custom implementation
- **Initial languages:** English, Chinese, Arabic, Spanish

### 35. "System" Theme Option
- **Current:** Only dark/light toggle
- **Feature:** Add "System" option that follows OS preference via `prefers-color-scheme` media query
- **Effort:** Low — add media query listener

---

## 📊 Effort vs. Impact Matrix

| Feature | Effort | Impact | Category |
|---------|--------|--------|----------|
| Type safety for liveFleet | Low | High | Tech Debt |
| Extract shared ship utils | Low | High | Tech Debt |
| Interval/memory cleanup | Low | Critical | Tech Debt |
| Toast notifications | Medium | High | UX |
| Map marker clustering | Low | High | Perf |
| Loading skeletons | Low | Medium | UX |
| Virtual scrolling | Medium | High | Perf |
| Web Worker AIS | High | High | Perf |
| Weather overlay | Medium | Medium | Feature |
| Vessel track history | Medium | High | Feature |
| Push notifications | Medium | Medium | Feature |
| Mobile responsive | High | High | UX |
| Component lifecycle | High | High | Arch |
| Dynamic imports | Low | Medium | Perf |
| Store middleware | Medium | Medium | Arch |
| CSS Modules | High | Medium | Arch |
| Carbon calculator | Medium | Medium | Feature |
| ETA prediction | Medium | High | Feature |

---

## Quick Wins (Can be done in <1 hour each)

1. ✅ Create `src/utils/ship.ts` with shared type/nav helpers → eliminates 100+ lines of dup code
2. ✅ Add proper `LiveVessel` type → remove `any[]` from state.ts
3. ✅ Fix map theme sync → subscribe to store theme changes
4. ✅ Add loading skeleton CSS → improved perceived performance
5. ✅ Fix dashboard interval cleanup → add onUnmount pattern
6. ✅ Add `system` theme option → follow OS preference
7. ✅ Port congestion heatmap → reuse existing data on tracking map
8. ✅ Keyboard shortcuts cheat sheet → press `?` key
9. ✅ Multiple export formats (JSON, GeoJSON)
10. ✅ Saved filters with localStorage