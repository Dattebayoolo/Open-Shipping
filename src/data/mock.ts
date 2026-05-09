// ============================================================
// MOCK DATA GENERATOR
// ============================================================

import type { Shipment, ShipmentMode, ShipmentStatus, ShipmentEvent } from '@/types/shipment';
import type { Alert, AlertType, AlertSeverity } from '@/types/alert';
import type { Vessel, VesselType, VesselStatus } from '@/types/fleet';
import type { Port, Route, CongestionLevel } from '@/types/port';
import type { ShippingDocument, DocumentType, DocumentStatus } from '@/types/document';
import type { AppState } from '@/types/state';

// ---- Helpers -------------------------------------------------------

function uid(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(5, '0')}`;
}

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ---- Static data pools ---------------------------------------------

const CARRIERS = ['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'COSCO', 'Evergreen', 'Yang Ming', 'ONE'];
const CARGO_TYPES = ['Electronics', 'Automotive Parts', 'Textiles', 'Chemicals', 'Food & Beverage', 'Machinery', 'Pharmaceuticals', 'Steel', 'Consumer Goods'];

const PORTS: Port[] = [
  { id: 'p1', locode: 'CNSHA', name: 'Shanghai', country: 'CN', coords: [31.23, 121.47], congestion: 'high', avgDwellTime: 4.2, openBerths: 3, totalBerths: 24, currentVessels: 21, weatherAlert: null, timezone: 'Asia/Shanghai' },
  { id: 'p2', locode: 'SGSIN', name: 'Singapore', country: 'SG', coords: [1.29, 103.85], congestion: 'medium', avgDwellTime: 2.1, openBerths: 8, totalBerths: 30, currentVessels: 22, weatherAlert: null, timezone: 'Asia/Singapore' },
  { id: 'p3', locode: 'NLRTM', name: 'Rotterdam', country: 'NL', coords: [51.92, 4.47], congestion: 'medium', avgDwellTime: 3.0, openBerths: 12, totalBerths: 40, currentVessels: 28, weatherAlert: 'Strong winds 35kn', timezone: 'Europe/Amsterdam' },
  { id: 'p4', locode: 'USNYC', name: 'New York', country: 'US', coords: [40.71, -74.00], congestion: 'low', avgDwellTime: 2.8, openBerths: 15, totalBerths: 28, currentVessels: 13, weatherAlert: null, timezone: 'America/New_York' },
  { id: 'p5', locode: 'CNQIN', name: 'Qingdao', country: 'CN', coords: [36.06, 120.38], congestion: 'critical', avgDwellTime: 5.5, openBerths: 1, totalBerths: 18, currentVessels: 17, weatherAlert: 'Typhoon Warning', timezone: 'Asia/Shanghai' },
  { id: 'p6', locode: 'AEDXB', name: 'Dubai (Jebel Ali)', country: 'AE', coords: [24.83, 55.02], congestion: 'low', avgDwellTime: 1.8, openBerths: 22, totalBerths: 35, currentVessels: 13, weatherAlert: null, timezone: 'Asia/Dubai' },
  { id: 'p7', locode: 'DEHAM', name: 'Hamburg', country: 'DE', coords: [53.55, 9.99], congestion: 'medium', avgDwellTime: 3.4, openBerths: 9, totalBerths: 26, currentVessels: 17, weatherAlert: null, timezone: 'Europe/Berlin' },
  { id: 'p8', locode: 'GBFXT', name: 'Felixstowe', country: 'GB', coords: [51.95, 1.35], congestion: 'low', avgDwellTime: 2.2, openBerths: 14, totalBerths: 22, currentVessels: 8, weatherAlert: null, timezone: 'Europe/London' },
  { id: 'p9', locode: 'JPYOK', name: 'Yokohama', country: 'JP', coords: [35.44, 139.63], congestion: 'low', avgDwellTime: 1.9, openBerths: 18, totalBerths: 24, currentVessels: 6, weatherAlert: null, timezone: 'Asia/Tokyo' },
  { id: 'p10', locode: 'KRPUS', name: 'Busan', country: 'KR', coords: [35.10, 129.04], congestion: 'medium', avgDwellTime: 2.6, openBerths: 10, totalBerths: 28, currentVessels: 18, weatherAlert: null, timezone: 'Asia/Seoul' },
];

const PORT_PAIRS = [
  [PORTS[0], PORTS[2]], [PORTS[0], PORTS[3]], [PORTS[1], PORTS[2]],
  [PORTS[4], PORTS[3]], [PORTS[5], PORTS[6]], [PORTS[8], PORTS[2]],
  [PORTS[9], PORTS[3]], [PORTS[0], PORTS[7]], [PORTS[1], PORTS[3]],
  [PORTS[2], PORTS[0]], [PORTS[6], PORTS[5]], [PORTS[3], PORTS[0]],
];

const MODES: ShipmentMode[] = ['sea', 'sea', 'sea', 'air', 'road', 'rail'];
const STATUSES: ShipmentStatus[] = ['pending', 'picked_up', 'in_transit', 'at_port', 'customs_hold', 'out_for_delivery', 'delivered', 'delayed'];

// ---- Generators ---------------------------------------------------

function generateEvents(status: ShipmentStatus): ShipmentEvent[] {
  const flow: ShipmentStatus[] = ['pending', 'picked_up', 'in_transit', 'at_port', 'out_for_delivery', 'delivered'];
  const idx = flow.indexOf(status);
  const reached = idx === -1 ? 2 : idx;

  return flow.slice(0, reached + 1).map((s, i) => ({
    id: `evt-${i}`,
    timestamp: daysAgo(reached - i + rnd(0, 1)),
    location: i === 0 ? 'Origin Warehouse' : i === reached ? 'Current Location' : 'Transit Hub',
    status: s,
    description: {
      pending: 'Shipment created and awaiting pickup',
      picked_up: 'Package picked up from shipper',
      in_transit: 'En route to destination port',
      at_port: 'Arrived at port, awaiting customs clearance',
      customs_hold: 'Held for customs inspection',
      out_for_delivery: 'Out for final delivery',
      delivered: 'Successfully delivered to consignee',
      delayed: 'Delayed due to port congestion',
    }[s] ?? '',
  }));
}

function generateShipments(count: number): Shipment[] {
  return Array.from({ length: count }, (_, i) => {
    const [origin, destination] = pick(PORT_PAIRS);
    const status = pick(STATUSES);
    const mode = pick(MODES);
    const carrier = pick(CARRIERS);

    return {
      id: uid('SHP', i + 1),
      trackingId: `${carrier.substring(0, 4).toUpperCase()}${rnd(100000000, 999999999)}`,
      carrier,
      mode,
      status,
      origin: { port: origin.locode, name: origin.name, country: origin.country, coords: origin.coords },
      destination: { port: destination.locode, name: destination.name, country: destination.country, coords: destination.coords },
      etd: daysAgo(rnd(5, 30)),
      eta: daysFromNow(rnd(1, 20)),
      ata: status === 'delivered' ? daysAgo(rnd(1, 5)) : null,
      cargo: {
        description: pick(CARGO_TYPES),
        weight: rnd(500, 25000),
        unit: 'kg',
        volume: rnd(5, 80),
        containers: rnd(1, 8),
        value: rnd(10000, 500000),
      },
      shipper: { name: pick(['TechCorp GmbH', 'Global Mfg Ltd', 'Asia Export Co', 'Pacific Trade Inc']), contact: 'ops@company.com', address: origin.name },
      consignee: { name: pick(['EuroDistrib BV', 'US Imports LLC', 'Gulf Trading Co', 'Nordic Logistics AS']), contact: 'receive@consignee.com', address: destination.name },
      events: generateEvents(status),
      documentIds: [],
      alertIds: [],
      revenue: rnd(2000, 45000),
    };
  });
}

function generateFleet(): Vessel[] {
  const vessels: { name: string; type: VesselType; flag: string; imo: string }[] = [
    { name: 'MSC Lydia', type: 'container', flag: 'PA', imo: '9705159' },
    { name: 'Maersk Elba', type: 'container', flag: 'DK', imo: '9778978' },
    { name: 'COSCO Harmony', type: 'container', flag: 'CN', imo: '9362552' },
    { name: 'Hapag Berlin', type: 'container', flag: 'DE', imo: '9448814' },
    { name: 'Eagle Spirit', type: 'tanker', flag: 'MH', imo: '9301456' },
    { name: 'Nordic Bulk', type: 'bulk', flag: 'NO', imo: '9512367' },
    { name: 'Gulf Star', type: 'tanker', flag: 'AE', imo: '9623478' },
    { name: 'Pacific Rover', type: 'ro-ro', flag: 'JP', imo: '9734589' },
  ];

  return vessels.map((v, i) => {
    const port = pick(PORTS);
    const util = rnd(40, 98);
    const statuses: VesselStatus[] = ['at_sea', 'in_port', 'loading', 'unloading', 'at_sea', 'at_sea'];
    return {
      id: uid('VSL', i + 1),
      ...v,
      capacity: v.type === 'container' ? rnd(8000, 24000) : rnd(50000, 300000),
      utilization: util,
      status: pick(statuses),
      currentLocation: port.name,
      currentCoords: [port.coords[0] + (Math.random() - 0.5) * 2, port.coords[1] + (Math.random() - 0.5) * 2] as [number, number],
      currentVoyage: `V${rnd(100, 999)}E`,
      nextVoyage: `V${rnd(100, 999)}W`,
      eta: daysFromNow(rnd(1, 15)),
      maintenanceDue: Math.random() > 0.7 ? daysFromNow(rnd(5, 60)) : null,
    };
  });
}

function generateAlerts(shipments: Shipment[]): Alert[] {
  const types: { type: AlertType; severity: AlertSeverity; title: string; message: string }[] = [
    { type: 'delay_detected', severity: 'critical', title: 'Delay Detected', message: 'Shipment delayed 3 days due to port congestion at Qingdao.' },
    { type: 'customs_hold', severity: 'critical', title: 'Customs Hold', message: 'Shipment held at Rotterdam customs for additional documentation.' },
    { type: 'vessel_deviation', severity: 'warning', title: 'Vessel Deviation', message: 'MSC Lydia has deviated from planned route due to weather.' },
    { type: 'sla_breach_risk', severity: 'critical', title: 'SLA Breach Risk', message: 'Shipment ETA exceeds contracted delivery date by 2 days.' },
    { type: 'document_missing', severity: 'warning', title: 'Document Missing', message: 'Bill of lading not received for shipment.' },
    { type: 'delivery_confirmed', severity: 'info', title: 'Delivery Confirmed', message: 'Shipment delivered successfully to consignee.' },
    { type: 'weather_advisory', severity: 'warning', title: 'Weather Advisory', message: 'Typhoon warning issued for South China Sea routes.' },
    { type: 'delay_detected', severity: 'warning', title: 'Minor Delay', message: 'Estimated 12-hour delay at Singapore transshipment hub.' },
  ];

  return Array.from({ length: 18 }, (_, i) => {
    const tpl = pick(types);
    const shipment = pick(shipments);
    return {
      id: uid('ALT', i + 1),
      shipmentId: Math.random() > 0.2 ? shipment.id : null,
      ...tpl,
      timestamp: daysAgo(rnd(0, 7)),
      read: Math.random() > 0.4,
      acknowledged: Math.random() > 0.6,
    };
  });
}

function generateDocuments(shipments: Shipment[]): ShippingDocument[] {
  const docTypes: DocumentType[] = ['bill_of_lading', 'commercial_invoice', 'packing_list', 'customs_declaration', 'certificate_of_origin', 'insurance'];
  const docNames: Record<DocumentType, string> = {
    bill_of_lading: 'Bill of Lading',
    commercial_invoice: 'Commercial Invoice',
    packing_list: 'Packing List',
    customs_declaration: 'Customs Declaration',
    certificate_of_origin: 'Certificate of Origin',
    insurance: 'Marine Insurance Certificate',
  };
  const statuses: DocumentStatus[] = ['draft', 'submitted', 'approved', 'approved', 'approved', 'rejected'];

  return Array.from({ length: 24 }, (_, i) => {
    const type = pick(docTypes);
    return {
      id: uid('DOC', i + 1),
      type,
      name: `${docNames[type]} - ${pick(shipments).id}`,
      shipmentId: Math.random() > 0.1 ? pick(shipments).id : null,
      status: pick(statuses),
      uploadedAt: daysAgo(rnd(0, 30)),
      uploadedBy: pick(['Kaza Mahmood', 'Sarah Chen', 'Ali Hassan', 'Maria Lopez']),
      fileSize: rnd(50000, 2000000),
      fileType: pick(['pdf', 'pdf', 'pdf', 'xlsx']),
    };
  });
}

function generateRoutes(): Route[] {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return PORT_PAIRS.slice(0, 6).map((pair, i) => ({
    id: uid('RTE', i + 1),
    origin: pair[0].locode,
    destination: pair[1].locode,
    carrier: pick(CARRIERS),
    avgTransitDays: rnd(14, 42),
    costPerKg: parseFloat((Math.random() * 3 + 0.5).toFixed(2)),
    onTimeRate: rnd(72, 98),
    history: months.map(month => ({
      month,
      transitDays: rnd(12, 45),
      costPerKg: parseFloat((Math.random() * 3 + 0.5).toFixed(2)),
    })),
  }));
}

// ---- Export -------------------------------------------------------

export function generateMockState(): AppState {
  const shipments = generateShipments(42);
  const alerts = generateAlerts(shipments);
  const documents = generateDocuments(shipments);

  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;

  return {
    theme: savedTheme ?? 'dark',
    shipments,
    fleet: generateFleet(),
    ports: PORTS,
    routes: generateRoutes(),
    alerts,
    documents,
    liveFleet: [],
    aisStatus: 'disconnected',
    settings: {
      dateFormat: 'DD/MM/YYYY',
      currency: 'USD',
      units: 'metric',
      mapStyle: 'dark',
      notifications: {
        delay_detected: true,
        customs_hold: true,
        vessel_deviation: true,
        sla_breach_risk: true,
        document_missing: false,
        delivery_confirmed: true,
        weather_advisory: true,
      },
      apiKeys: {
        aisstream: '341f7326381072811c76b2b7fdeaa65b4eee1f73'
      },
    },
    ui: {
      currentPage: '/',
      sidebarCollapsed: false,
      activeShipmentId: null,
      drawerOpen: false,
      searchQuery: '',
    },
  };
}
