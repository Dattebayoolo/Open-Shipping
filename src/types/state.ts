// ============================================================
// APP STATE TYPES
// ============================================================

import type { Shipment } from './shipment';
import type { Alert } from './alert';
import type { Vessel } from './fleet';
import type { Port, Route } from './port';
import type { ShippingDocument } from './document';

export interface UserSettings {
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'ISO';
  currency: 'USD' | 'EUR' | 'GBP' | 'AED';
  units: 'metric' | 'imperial';
  mapStyle: 'dark' | 'light' | 'satellite';
  notifications: Record<string, boolean>;
  apiKeys: Record<string, string>;
}

export interface UIState {
  currentPage: string;
  sidebarCollapsed: boolean;
  activeShipmentId: string | null;
  drawerOpen: boolean;
  searchQuery: string;
}

export interface AppState {
  theme: 'dark' | 'light';
  shipments: Shipment[];
  fleet: Vessel[];
  ports: Port[];
  routes: Route[];
  alerts: Alert[];
  documents: ShippingDocument[];
  liveFleet: any[];
  aisStatus: string;
  settings: UserSettings;
  ui: UIState;
}

// Store event types
export type StoreListener<T> = (state: T) => void;
export type Unsubscribe = () => void;
