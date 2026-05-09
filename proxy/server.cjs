// ============================================================
// AIS PROXY SERVER
// Bridges browser → AISStream.io (required - browser CORS blocked)
// Usage: node proxy/server.js  OR  npm run proxy
// Set env var: AISSTREAM_API_KEY=your_key_here
// ============================================================

const WebSocket = require('ws');

const PORT = 8080;
const AIS_URL = 'wss://stream.aisstream.io/v0/stream';

// Bounding boxes: major shipping lanes + key port areas
const DEFAULT_BBOXES = [
  // North Atlantic (Europe ↔ Americas)
  [[30.0, -80.0], [65.0, 10.0]],
  // North Pacific (Asia ↔ Americas)
  [[20.0, 120.0], [60.0, -120.0]],
  // Indian Ocean / Suez / Malacca
  [[-10.0, 30.0], [30.0, 120.0]],
  // Mediterranean + Black Sea
  [[30.0, -5.0], [47.0, 42.0]],
];

const wss = new WebSocket.Server({ port: PORT });
console.log(`[AIS Proxy] Listening on ws://localhost:${PORT}`);

wss.on('connection', (clientWs) => {
  console.log('[AIS Proxy] Browser client connected');

  let apiKey = process.env.AISSTREAM_API_KEY || '';
  let aisWs = null;

  function connectToAIS(key, bboxes) {
    if (aisWs) {
      try { aisWs.close(); } catch (_) {}
    }

    aisWs = new WebSocket(AIS_URL);

    aisWs.on('open', () => {
      console.log('[AIS Proxy] Connected to AISStream.io');
      const sub = {
        APIKey: key,
        BoundingBoxes: bboxes || DEFAULT_BBOXES,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      aisWs.send(JSON.stringify(sub));
      // Notify client we're live
      clientWs.send(JSON.stringify({ _type: 'status', status: 'connected', source: 'aisstream' }));
    });

    aisWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data.toString());
      }
    });

    aisWs.on('error', (err) => {
      console.error('[AIS Proxy] AISStream error:', err.message);
      clientWs.send(JSON.stringify({ _type: 'status', status: 'error', message: err.message }));
    });

    aisWs.on('close', () => {
      console.log('[AIS Proxy] AISStream connection closed');
      clientWs.send(JSON.stringify({ _type: 'status', status: 'disconnected' }));
    });
  }

  // If API key already set via env, auto-connect
  if (apiKey) {
    connectToAIS(apiKey, DEFAULT_BBOXES);
  } else {
    clientWs.send(JSON.stringify({ _type: 'status', status: 'awaiting_key', message: 'Set your AISStream API key in Settings → API Keys' }));
  }

  // Listen for commands from browser (e.g. set API key, update bboxes)
  clientWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg._type === 'subscribe' && msg.apiKey) {
        console.log('[AIS Proxy] Received API key from browser, connecting...');
        apiKey = msg.apiKey;
        connectToAIS(apiKey, msg.bboxes || DEFAULT_BBOXES);
      }
    } catch (e) {
      console.error('[AIS Proxy] Invalid message from browser:', e.message);
    }
  });

  clientWs.on('close', () => {
    console.log('[AIS Proxy] Browser client disconnected');
    if (aisWs) {
      try { aisWs.close(); } catch (_) {}
    }
  });
});

// Heartbeat to keep connections alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30_000);
