export type SatelliteStatus = 'healthy' | 'warning' | 'critical';

export interface Satellite {
  id: string;
  name: string;
  noradId: string;
  status: SatelliteStatus;
  orbitType: string;
  altitude: number; // km
  inclination: number; // degrees
  lat: number;
  lng: number;
  subsystems: SubsystemHealth[];
  launchDate: string;
  mission: string;
}

export interface SubsystemHealth {
  name: string;
  key: string;
  healthScore: number; // 0-100
  status: SatelliteStatus;
  sensors: SensorData[];
}

export interface SensorData {
  name: string;
  unit: string;
  currentValue: number;
  normalMin: number;
  normalMax: number;
  criticalMin: number;
  criticalMax: number;
}

export interface AnomalyEvent {
  id: string;
  satelliteId: string;
  satelliteName: string;
  timestamp: string;
  subsystem: string;
  sensor: string;
  anomalyScore: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  resolved: boolean;
  actionTaken?: string;
}

export interface TelemetryPoint {
  time: string;
  value: number;
  baseline: number;
  anomaly?: boolean;
}

export interface RULPrediction {
  componentName: string;
  subsystem: string;
  currentHealth: number;
  rulDays: number;
  confidenceMargin: number; // ± days
  degradationRate: number; // per day
  failureThreshold: number;
  historicalData: { day: number; health: number; upper: number; lower: number }[];
}

export interface AlertConfig {
  subsystem: string;
  sensitivity: number; // 0-100
  enabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
}
