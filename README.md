<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/ship.svg" alt="Open Shipping Logo" width="80" height="80">

  # Open Shipping v2.0
  **High-Performance Global Fleet & Logistics Operations Dashboard**

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)](https://leafletjs.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
</div>

<br />

## 🌍 Overview

**Open Shipping** is a professional-grade, browser-based logistics tracking platform. Moving far beyond static mock data, this dashboard integrates directly with **AISStream.io** to ingest real-time marine telemetry, visualizing the live coordinates, headings, speeds, and navigation statuses of thousands of commercial vessels globally. 

Built with zero complex frontend frameworks—relying entirely on **Vanilla CSS** and **TypeScript** via Vite—it demonstrates how high-performance, complex dashboards can be engineered natively.

---

## ✨ Key Features (v2.0)

- **📡 Real-Time AIS Telemetry**: Connects to a custom Node.js WebSocket proxy to stream live vessel data from `aisstream.io` directly into the UI.
- **🗺️ High-Density Interactive Map**: Powered by Leaflet.js, featuring **Marker Clustering** (`leaflet.markercluster`) for rendering thousands of ships without lag, and dynamic SVG markers that rotate to match real-world Course Over Ground (COG).
- **🔥 Shipping Lane Heatmaps**: Instantly toggle a density heatmap (`leaflet.heat`) to visualize global shipping lanes and congestion patterns.
- **☁️ Live Weather Integration**: Integrates the **Open-Meteo API** to display real-time weather cards at major shipping hubs.
- **📊 Live Dashboard**: A unified overview panel that calculates average fleet speeds, active vessel counts, top destinations, and real-time fleet composition charts (via Chart.js).
- **🚢 Fleet Explorer & Virtual Scrolling**: A high-performance data table utilizing **Virtual Scrolling** to render thousands of live ships flawlessly.
- **📋 Shipment Kanban View**: Organize global fleet tracking dynamically by navigation status (Under Way, Moored, Other).
- **🚨 Intelligent Anomaly Detection & Push Notifications**: Background services analyze telemetry to detect anomalies (speed drop, adrift vessels, missing signals) and alert users via native **Browser Push Notifications**.
- **📱 Fully Responsive Design**: Seamlessly transitions into a mobile-friendly layout with slide-out drawers, full-screen map modes, and optimized touch targets.

---

## 🛠️ Technology Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Tooling** | Vite 5, Vitest, ESLint | Lightning-fast module bundler, robust unit testing, and code quality linting. |
| **Language** | TypeScript 5 | Strict-mode typed data models and store architecture. |
| **Styling** | Vanilla CSS | Completely bespoke CSS architecture with variables, grid systems, and micro-animations. |
| **State Management** | Custom Pub/Sub + Middleware | Lightweight reactive store with custom **Logger** and **Persistence** middlewares. |
| **Maps & Charts** | Leaflet.js, Chart.js | Advanced geospatial clustering, heatmaps, and data visualization. |
| **Backend / Network** | Node.js, `ws` | Local WebSocket proxy to bypass CORS and secure API credentials. |

---

## 🚀 Getting Started

### Prerequisites
You will need **Node.js 18+** installed on your machine. You will also need a free API key from [AISStream.io](https://aisstream.io/).

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/open-shipping.git
cd open-shipping
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your AISStream API key:
```env
AISSTREAM_API_KEY=your_api_key_here
```
*(Note: You can also configure this dynamically via the in-app "Settings" page!)*

### 3. Run the Development Environment
This project requires two processes running simultaneously: the Vite frontend and the Node.js WebSocket proxy.

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (WebSocket Proxy):**
```bash
npm run proxy
```

### 4. Tests and Linting
To run the automated test suite (Vitest) and the linter:
```bash
npm run test
npm run lint
```

### 5. Open the App
Navigate to `http://localhost:5173` in your browser. The dashboard will automatically connect to the proxy and begin rendering live ships globally.

---

## 📂 Project Architecture

The repository is structured to prioritize modularity, lifecycle management, and separation of concerns:

```text
open-shipping/
├── proxy/
│   └── server.js         # Node.js WebSocket bridge for AIS data
├── src/
│   ├── components/       # Reusable UI shells (Sidebar, Topbar, Toasts)
│   ├── data/             # AIS Socket connection logic and anomaly detection
│   ├── pages/            # View controllers with unmount lifecycle hooks
│   ├── router/           # Custom hash-based SPA routing with unmount handling
│   ├── services/         # External API integrations (e.g. Open-Meteo)
│   ├── store/            # Typed Pub/Sub state system with Persistence middleware
│   ├── styles/           # CSS tokens, base layouts, and animations
│   ├── utils/            # Shared formatting, caching, and rAF throttle utilities
│   └── types/            # TypeScript interfaces and enums
└── index.html            # Application entry point
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License
This project is [MIT](LICENSE) licensed.
