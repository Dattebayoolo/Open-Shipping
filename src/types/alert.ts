// ============================================================
// ALERT TYPES
// ============================================================

export type AlertType =
  | 'delay_detected'
  | 'customs_hold'
  | 'vessel_deviation'
  | 'sla_breach_risk'
  | 'document_missing'
  | 'delivery_confirmed'
  | 'weather_advisory';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  shipmentId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  acknowledged: boolean;
}
