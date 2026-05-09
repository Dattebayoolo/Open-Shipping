// ============================================================
// FLEET TYPES
// ============================================================

export type VesselType = 'container' | 'tanker' | 'bulk' | 'ro-ro' | 'truck' | 'aircraft';
export type VesselStatus = 'at_sea' | 'in_port' | 'loading' | 'unloading' | 'maintenance' | 'idle';

export interface Vessel {
  id: string;
  name: string;
  type: VesselType;
  flag: string;         // ISO-2 country code
  imo?: string;
  capacity: number;     // TEU or tons
  utilization: number;  // 0-100 percent
  status: VesselStatus;
  currentLocation: string;
  currentCoords: [number, number];
  currentVoyage: string | null;
  nextVoyage: string | null;
  eta: string | null;
  maintenanceDue: string | null;
}
