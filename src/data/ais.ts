import { store } from '@/store';

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

// The raw Map is kept here for performance, and we push an array version to the store periodically
export const liveShipsMap = new Map<number, any>();

export function initAIS(): void {
  connect();
  
  // Every 2 seconds, update the store with the latest array of ships
  setInterval(() => {
    if (liveShipsMap.size > 0) {
      store.setState({ liveFleet: Array.from(liveShipsMap.values()) });
    }
  }, 2000);
}

function connect() {
  if (socket) socket.close();

  socket = new WebSocket('ws://localhost:8080');

  socket.onopen = () => {
    store.setState({ aisStatus: 'connected' });
    const apiKey = store.getState().settings.apiKeys?.aisstream;
    if (apiKey) {
      socket?.send(JSON.stringify({ _type: 'subscribe', apiKey }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data._type === 'status') {
        store.setState({ aisStatus: data.status === 'connected' ? 'live' : data.status });
        return;
      }

      if (data.MessageType === 'PositionReport' || data.MessageType === 'ShipStaticData') {
        const mmsi = data.MetaData.MMSI;
        const existing = liveShipsMap.get(mmsi) || { mmsi, name: data.MetaData.ShipName || 'Unknown Vessel' };
        
        if (data.MessageType === 'PositionReport') {
          existing.lat = data.Message.PositionReport.Latitude;
          existing.lng = data.Message.PositionReport.Longitude;
          existing.cog = data.Message.PositionReport.Cog;
          existing.sog = data.Message.PositionReport.Sog;
          existing.heading = data.Message.PositionReport.TrueHeading;
          existing.navStatus = data.Message.PositionReport.NavigationalStatus;
          existing.updated = new Date();
        } else if (data.MessageType === 'ShipStaticData') {
          existing.name = data.Message.ShipStaticData.Name?.trim() || existing.name;
          existing.type = data.Message.ShipStaticData.Type;
          existing.destination = data.Message.ShipStaticData.Destination?.trim();
          existing.callsign = data.Message.ShipStaticData.CallSign?.trim();
          existing.imo = data.Message.ShipStaticData.ImoNumber;
          existing.dim = data.Message.ShipStaticData.Dimension;
          existing.eta = data.Message.ShipStaticData.Eta;
        }
        
        liveShipsMap.set(mmsi, existing);
      }
    } catch (e) {}
  };

  socket.onclose = () => {
    store.setState({ aisStatus: 'disconnected' });
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  };
}
