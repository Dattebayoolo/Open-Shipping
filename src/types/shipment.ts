// ============================================================
// SHIPMENT TYPES
// ============================================================

export type ShipmentMode = 'sea' | 'air' | 'road' | 'rail';

export type ShipmentStatus =
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'at_port'
  | 'customs_hold'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed';

export interface PortRef {
  port: string;       // LOCODE e.g. "CNSHA"
  name: string;
  country: string;    // ISO-2 e.g. "CN"
  coords: [number, number]; // [lat, lng]
}

export interface Cargo {
  description: string;
  weight: number;
  unit: 'kg' | 'lb';
  volume: number;     // m³
  containers: number;
  value: number;      // USD
}

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  location: string;
  status: ShipmentStatus;
  description: string;
}

export interface Contact {
  name: string;
  contact: string;
  address?: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  carrier: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  origin: PortRef;
  destination: PortRef;
  etd: string;        // ISO datetime
  eta: string;
  ata: string | null;
  cargo: Cargo;
  shipper: Contact;
  consignee: Contact;
  events: ShipmentEvent[];
  documentIds: string[];
  alertIds: string[];
  revenue: number;    // USD
}
