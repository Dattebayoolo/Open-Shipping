// ============================================================
// PORT TYPES
// ============================================================

export type CongestionLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Port {
  id: string;
  locode: string;
  name: string;
  country: string;   // ISO-2
  coords: [number, number];
  congestion: CongestionLevel;
  avgDwellTime: number; // days
  openBerths: number;
  totalBerths: number;
  currentVessels: number;
  weatherAlert: string | null;
  timezone: string;
}

export interface Route {
  id: string;
  origin: string;     // port locode
  destination: string;
  carrier: string;
  avgTransitDays: number;
  costPerKg: number;  // USD
  onTimeRate: number; // 0-100
  history: { month: string; transitDays: number; costPerKg: number }[];
}
