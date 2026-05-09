# Open Shipping — Comprehensive Implementation Plan (TypeScript Edition)

> **Design Language:** Monochromatic (Dark / Light toggle) · Green & Red accents · Sleek Minimalism  
> **Stack:** Vite + TypeScript + Vanilla CSS  
> **Target:** Professional-grade logistics & shipping data dashboard

---

## 1. Vision & Scope

Open Shipping is a **real-time shipping operations dashboard** that gives logistics teams, operators, and analysts a unified view of:

- Live shipment tracking across carriers
- Fleet & vessel status
- Port congestion & route analytics
- Document management (bills of lading, invoices, customs)
- Alerts, anomalies, and SLA breach warnings

---

## 2. Design System

### 2.1 Color Tokens

| Token | Dark Theme | Light Theme | Purpose |
|---|---|---|---|
| `--bg-primary` | `#0a0a0a` | `#f5f5f5` | App background |
| `--bg-surface` | `#111111` | `#ffffff` | Card / panel surface |
| `--bg-elevated` | `#1a1a1a` | `#ebebeb` | Modals, dropdowns |
| `--border` | `#222222` | `#d4d4d4` | Dividers, card borders |
| `--text-primary` | `#f0f0f0` | `#111111` | Headlines, labels |
| `--text-secondary` | `#888888` | `#555555` | Subtext, metadata |
| `--text-muted` | `#444444` | `#aaaaaa` | Placeholders |
| `--accent-green` | `#22c55e` | `#16a34a` | On-time, active, success |
| `--accent-red` | `#ef4444` | `#dc2626` | Delayed, error, critical |
| `--accent-amber` | `#f59e0b` | `#d97706` | Warning, pending |
| `--accent-blue` | `#3b82f6` | `#2563eb` | Info, links |

### 2.2 Typography

```
Font Family: 'Inter', sans-serif (Google Fonts)
Monospace: 'JetBrains Mono', monospace (tracking IDs, codes)

--text-xs:   11px / 1.4
--text-sm:   13px / 1.5
--text-base: 15px / 1.6
--text-lg:   18px / 1.5
--text-xl:   22px / 1.4
--text-2xl:  28px / 1.3
--text-3xl:  36px / 1.2
```

### 2.3 Spacing & Radius

```
--space-1: 4px    --space-2: 8px    --space-3: 12px
--space-4: 16px   --space-5: 24px   --space-6: 32px
--space-7: 48px   --space-8: 64px

--radius-sm: 4px   --radius-md: 8px
--radius-lg: 12px  --radius-full: 9999px
```

### 2.4 UI Micro-animations

- Cards: `opacity 0 → 1`, `translateY(8px) → 0` on load (staggered 60ms)
- Status badges: subtle `scale(1) → scale(1.04)` pulse for live states
- Theme toggle: smooth `background`, `color`, `border-color` transitions (250ms ease)
- Table rows: `background` highlight on hover (150ms)
- Sidebar links: left-border slide-in accent on active (200ms)
- KPI counters: animated number roll on data load

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Bundler** | Vite 5 | Zero-config, instant HMR, native ESM |
| **Language** | TypeScript 5 (strict mode) | Type safety, interfaces for data models |
| **Styling** | Vanilla CSS (modules via `?inline`) | Full control, no framework overhead |
| **Routing** | Custom hash router (typed) | Lightweight SPA without React Router |
| **State** | Typed pub/sub store | Simple, no Redux overhead |
| **Charts** | Chart.js 4 + typed wrappers | Full chart type support |
| **Maps** | Leaflet 1.9 + `@types/leaflet` | Interactive world map |
| **Icons** | Lucide (ES module imports) | Tree-shakeable SVG icons |
| **Linting** | ESLint + typescript-eslint | Code quality |
| **Formatting** | Prettier | Consistent style |

---

## 4. Application Architecture

```
open-shipping/
├── index.html                    # App shell entry point
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript strict config
├── package.json
├── .eslintrc.json
├── .prettierrc
└── src/
    ├── main.ts                   # App bootstrap
    ├── styles/
    │   ├── tokens.css            # Design tokens & CSS vars
    │   ├── base.css              # Reset, typography, scrollbars
    │   ├── layout.css            # Sidebar, topbar, content grid
    │   ├── components.css        # Cards, tables, badges, modals
    │   └── animations.css        # All keyframes & transitions
    ├── types/
    │   ├── shipment.ts           # Shipment, Event, Cargo interfaces
    │   ├── fleet.ts              # Vessel, Vehicle interfaces
    │   ├── port.ts               # Port, Route interfaces
    │   ├── alert.ts              # Alert, Severity enums
    │   ├── document.ts           # ShippingDocument interfaces
    │   └── state.ts              # AppState, StoreEvent types
    ├── store/
    │   ├── index.ts              # Typed pub/sub store factory
    │   └── actions.ts            # Typed action creators
    ├── router/
    │   └── index.ts              # Hash-based typed router
    ├── data/
    │   ├── mock.ts               # Realistic typed mock data generator
    │   └── api.ts                # API abstraction (mock ↔ real swap)
    ├── pages/
    │   ├── dashboard.ts          # Overview / KPI page
    │   ├── shipments.ts          # Shipments list & detail
    │   ├── tracking.ts           # Live map tracking view
    │   ├── fleet.ts              # Vessel & vehicle management
    │   ├── ports.ts              # Port status & congestion
    │   ├── documents.ts          # Document vault
    │   ├── alerts.ts             # Alert center
    │   └── settings.ts           # Preferences & configuration
    └── components/
        ├── sidebar.ts
        ├── topbar.ts
        ├── kpi-card.ts
        ├── data-table.ts         # Generic typed DataTable<T>
        ├── status-badge.ts
        ├── modal.ts
        ├── chart.ts              # Chart.js typed wrapper
        └── timeline.ts           # Shipment event timeline
```

---

## 5. TypeScript Type System

### Core Interfaces

```typescript
// types/shipment.ts
export type ShipmentMode = 'sea' | 'air' | 'road' | 'rail';
export type ShipmentStatus =
  | 'pending' | 'picked_up' | 'in_transit' | 'at_port'
  | 'customs_hold' | 'out_for_delivery' | 'delivered' | 'delayed';

export interface PortRef {
  port: string;    // IATA/LOCODE e.g. "CNSHA"
  name: string;
  country: string; // ISO-2
  coords: [number, number]; // [lat, lng]
}

export interface Cargo {
  description: string;
  weight: number;
  unit: 'kg' | 'lb';
  volume: number;  // m³
  containers: number;
}

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  location: string;
  status: ShipmentStatus;
  description: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  carrier: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  origin: PortRef;
  destination: PortRef;
  etd: string;
  eta: string;
  ata: string | null;
  cargo: Cargo;
  shipper: { name: string; contact: string };
  consignee: { name: string; contact: string };
  events: ShipmentEvent[];
  documentIds: string[];
  alertIds: string[];
}
```

```typescript
// types/alert.ts
export type AlertType =
  | 'delay_detected' | 'customs_hold' | 'vessel_deviation'
  | 'sla_breach_risk' | 'document_missing'
  | 'delivery_confirmed' | 'weather_advisory';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  shipmentId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  read: boolean;
  acknowledged: boolean;
}
```

```typescript
// types/state.ts
export interface AppState {
  theme: 'dark' | 'light';
  shipments: Shipment[];
  fleet: Vessel[];
  ports: Port[];
  alerts: Alert[];
  documents: ShippingDocument[];
  settings: UserSettings;
  ui: {
    currentPage: string;
    sidebarCollapsed: boolean;
    activeShipmentId: string | null;
  };
}
```

---

## 6. Feature Breakdown

### 6.1 📊 Dashboard (Home)

**KPI Strip (top row, 4 cards):**
| Metric | Visual | Accent |
|---|---|---|
| Active Shipments | Large number + sparkline | Neutral |
| On-Time Rate | Ring gauge % | Green (≥90%) / Red (<80%) |
| Delayed Shipments | Count + delta vs yesterday | Red |
| Revenue This Month | $ value + trend arrow | Green / Red |

**Content Grid (2×2):**
- **Shipments by Status** — Horizontal stacked bar (In Transit, At Port, Delivered, Delayed, Customs Hold)
- **Route Performance** — Line chart: on-time % over 30 days
- **Top Carriers by Volume** — Ranked list with mini progress bars
- **Recent Alerts** — Last 5 alerts with severity icon + timestamp

---

### 6.2 📦 Shipments

**Toolbar:** Search · Filter (Status, Carrier, Origin, Destination, Date range) · Export CSV · New Shipment button

**Table Columns:**
| Column | Type |
|---|---|
| Tracking ID | Monospace badge, clickable |
| Origin → Destination | Flag icons + port codes |
| Carrier | Logo placeholder + name |
| Mode | Icon (🚢 Sea · ✈️ Air · 🚛 Road · 🚂 Rail) |
| Status | Colored badge |
| ETA | Date + countdown |
| Last Update | Relative time |
| Actions | ⋯ menu |

**Detail Drawer / Modal:**
- Full shipment metadata (shipper, consignee, cargo, weight, volume)
- Live event timeline (Picked Up → In Transit → At Port → Customs → Out for Delivery → Delivered)
- Attached documents list
- Carrier contact info
- Notes / comments thread

---

### 6.3 🗺️ Live Tracking

- **World map** (Leaflet.js with `@types/leaflet`, dark/light tile layers)
- Animated vessel/vehicle markers with typed tooltip popups
- Route polylines (completed = solid, upcoming = dashed)
- Cluster grouping when zoomed out
- Sidebar panel: searchable shipment list; clicking selects & centers on map
- Port markers with congestion color coding
- Filter by mode, status, carrier

---

### 6.4 🚢 Fleet Management

**Vessel/Vehicle Cards grid:**
- Name, type, flag, current location
- Capacity utilization bar (green/red)
- Current voyage / next voyage
- Maintenance status badge

**Fleet Table view toggle:**
- Sortable by utilization, status, ETA
- Generic `DataTable<Vessel>` component

---

### 6.5 ⚓ Ports & Routes

**Port Status Table:**
| Column | Type |
|---|---|
| Port Name | + country flag |
| Country | |
| Congestion Level | Low / Medium / High badge |
| Avg Dwell Time | Days |
| Open Berths | Count |
| Current Vessels | Count |
| Weather Alert | Icon + tooltip |

**Route Analytics:**
- Origin–Destination pair selector
- Transit time trend chart (last 12 months)
- Cost per kg trend

---

### 6.6 📄 Documents

**Categories:** Bill of Lading · Commercial Invoice · Packing List · Customs Declaration · Certificate of Origin · Insurance

**Features:**
- Upload via drag-and-drop
- Link documents to shipments
- Status: Draft → Submitted → Approved / Rejected
- Preview modal (PDF viewer iframe)
- Download / Delete / Share

---

### 6.7 🔔 Alert Center

**Alert Types:**
| Type | Accent |
|---|---|
| Delay Detected | Red |
| Customs Hold | Amber |
| Vessel Deviation | Amber |
| SLA Breach Risk | Red |
| Document Missing | Amber |
| Delivery Confirmed | Green |
| Weather Advisory | Blue |

**Features:**
- Grouped by severity (Critical · Warning · Info)
- Mark as Read / Acknowledge / Dismiss
- Filter by shipment, carrier, date
- Alert count badge on sidebar icon

---

### 6.8 ⚙️ Settings

- **Theme:** Dark / Light toggle (persisted to `localStorage`)
- **Default Map Style:** Dark tiles / Light tiles / Satellite
- **Notifications:** Toggle types on/off
- **Date Format:** DD/MM/YYYY · MM/DD/YYYY · ISO 8601
- **Currency:** USD · EUR · GBP · AED
- **Units:** Metric / Imperial
- **API Keys:** Carrier API key management (masked display)
- **Account:** User profile, role display

---

## 7. Phased Build Plan

### Phase 1 — Scaffold + Design System (Day 1)
- [ ] `npm create vite@latest . -- --template vanilla-ts`
- [ ] Configure `tsconfig.json` (strict, path aliases)
- [ ] Build CSS token + base + layout system
- [ ] Sidebar nav (typed route config, icon map)
- [ ] Topbar (search, theme toggle, alert bell, user avatar)
- [ ] Typed hash router
- [ ] Typed mock data generator

### Phase 2 — Dashboard & Shipments (Day 2)
- [ ] KPI cards with animated counters
- [ ] Chart.js typed wrapper + status bar chart
- [ ] 30-day trend line chart
- [ ] Generic `DataTable<T>` component
- [ ] Shipments table with search + filter
- [ ] Shipment detail drawer with event timeline

### Phase 3 — Tracking & Fleet (Day 3)
- [ ] Leaflet map with `@types/leaflet`
- [ ] Vessel markers, route polylines, port circles
- [ ] Fleet grid + table view
- [ ] Capacity utilization components

### Phase 4 — Ports, Documents & Alerts (Day 4)
- [ ] Port status table + congestion badges
- [ ] Document vault: upload UI, status badges, preview modal
- [ ] Alert center: grouped list, severity styling, badge counts

### Phase 5 — Settings, Polish & QA (Day 5)
- [ ] Settings page (theme, format, units, API keys)
- [ ] All animations & transitions
- [ ] Responsive breakpoints (1280px / 768px / mobile)
- [ ] Empty states, loading skeletons, error states
- [ ] Accessibility pass (ARIA labels, keyboard nav, focus rings)
- [ ] ESLint + Prettier pass
- [ ] Final cross-browser QA

---

## 8. Key Dependencies

| Package | Purpose |
|---|---|
| `vite` | Build tool & dev server |
| `typescript` | Language |
| `chart.js` | KPI charts, trend lines |
| `leaflet` + `@types/leaflet` | Interactive world map |
| `lucide` | Tree-shakeable SVG icons |
| `eslint` + `typescript-eslint` | Linting |
| `prettier` | Formatting |

---

## 9. Non-Functional Requirements

| Concern | Approach |
|---|---|
| **Type Safety** | `strict: true`, no `any`, all data models typed |
| **Performance** | Virtualized table rows for 1000+ shipments |
| **Responsiveness** | CSS Grid + clamp(), sidebar collapses on mobile |
| **Accessibility** | WCAG 2.1 AA contrast, keyboard nav, ARIA |
| **State Persistence** | Theme, filters, settings → `localStorage` (typed wrapper) |
| **Extensibility** | API layer abstracted; mock → real API is a one-file swap |
