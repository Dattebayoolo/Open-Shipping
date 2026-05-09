<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/ship.svg" alt="Open Shipping Logo" width="80" height="80">

  # Open Shipping
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

## ✨ Key Features

- **📡 Real-Time AIS Telemetry**: Connects to a custom Node.js WebSocket proxy to stream live vessel data from `aisstream.io` directly into the UI.
- **🗺️ Interactive Global Map**: Powered by Leaflet.js, featuring dynamic SVG ship markers that accurately rotate to match real-world Course Over Ground (COG).
- **📊 Live Dashboard**: A unified overview panel that calculates average fleet speeds, active vessel counts, top destinations, and real-time fleet composition charts (via Chart.js).
- **🚢 Fleet Explorer**: A high-performance, throttled data table that updates every second to display live vessel metrics, dimensions, and navigational statuses.
- **🎨 Premium Monochromatic Design**: Sleek, modern aesthetic featuring meticulously crafted CSS tokens, micro-animations, and a responsive grid system.

---

## 🛠️ Technology Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Tooling** | Vite 5 | Lightning-fast module bundler and dev server. |
| **Language** | TypeScript 5 | Strict-mode typed data models and store architecture. |
| **Styling** | Vanilla CSS | Completely bespoke CSS architecture with variables and modules. |
| **State Management** | Custom Pub/Sub | Lightweight reactive store without Redux overhead. |
| **Maps & Charts** | Leaflet.js, Chart.js | Complex geospatial rendering and data visualization. |
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

### 4. Open the App
Navigate to `http://localhost:5173` in your browser. The dashboard will automatically connect to the proxy and begin rendering live ships globally.

---

## 📂 Project Architecture

The repository is structured to prioritize modularity and separation of concerns:

```text
open-shipping/
├── proxy/
│   └── server.js         # Node.js WebSocket bridge for AIS data
├── src/
│   ├── components/       # Reusable UI shells (Sidebar, Topbar)
│   ├── data/             # State managers and AIS Socket connection logic
│   ├── pages/            # View controllers (Dashboard, Fleet, Tracking, etc.)
│   ├── router/           # Custom hash-based SPA routing
│   ├── store/            # Typed Pub/Sub reactive state system
│   ├── styles/           # CSS tokens, base layouts, and animations
│   └── types/            # TypeScript interfaces and enums
└── index.html            # Application entry point
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#) if you want to contribute.

## 📝 License
This project is [MIT](LICENSE) licensed.
