import { Satellite, AnomalyEvent, RULPrediction, AlertConfig, TelemetryPoint } from './types';

export const satellites: Satellite[] = [
  {
    id: 'sat-301', name: 'ASTRA-301', noradId: '55201', status: 'healthy',
    orbitType: 'LEO', altitude: 550, inclination: 53, lat: 28.5, lng: -80.6,
    launchDate: '2024-03-15', mission: 'Earth Observation',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 96, status: 'healthy', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 28.4, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 1240, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 42.1, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 92, status: 'healthy', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 22.3, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: -12.5, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: -5.2, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 98, status: 'healthy', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -68, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 2.1, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 94, status: 'healthy', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 3200, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 1.2, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
  {
    id: 'sat-312', name: 'ASTRA-312', noradId: '55212', status: 'critical',
    orbitType: 'LEO', altitude: 520, inclination: 51.6, lat: 45.2, lng: 12.3,
    launchDate: '2024-06-22', mission: 'Communications Relay',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 34, status: 'critical', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 23.1, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 820, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 62.8, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 58, status: 'warning', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 38.7, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: 15.2, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: 8.1, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 72, status: 'warning', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -78, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 18.3, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 88, status: 'healthy', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 3450, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 2.8, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
  {
    id: 'sat-305', name: 'ASTRA-305', noradId: '55205', status: 'healthy',
    orbitType: 'LEO', altitude: 580, inclination: 97.4, lat: -33.9, lng: 151.2,
    launchDate: '2024-01-10', mission: 'Weather Monitoring',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 99, status: 'healthy', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 28.9, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 1350, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 38.5, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 95, status: 'healthy', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 21.0, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: -18.2, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: -8.3, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 97, status: 'healthy', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -62, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 1.4, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 96, status: 'healthy', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 3100, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 0.9, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
  {
    id: 'sat-308', name: 'ASTRA-308', noradId: '55208', status: 'warning',
    orbitType: 'MEO', altitude: 2000, inclination: 55, lat: 12.1, lng: 77.6,
    launchDate: '2024-04-28', mission: 'Navigation',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 78, status: 'warning', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 26.2, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 1080, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 48.9, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 85, status: 'healthy', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 27.8, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: 5.2, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: 2.1, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 91, status: 'healthy', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -71, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 4.2, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 82, status: 'warning', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 2580, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 2.9, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
  {
    id: 'sat-315', name: 'ASTRA-315', noradId: '55215', status: 'healthy',
    orbitType: 'LEO', altitude: 600, inclination: 45, lat: -22.9, lng: -43.2,
    launchDate: '2024-08-05', mission: 'Scientific Research',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 94, status: 'healthy', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 28.1, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 1280, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 40.2, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 91, status: 'healthy', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 23.5, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: -8.1, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: -3.2, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 95, status: 'healthy', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -65, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 1.8, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 93, status: 'healthy', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 3350, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 1.1, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
  {
    id: 'sat-320', name: 'ASTRA-320', noradId: '55220', status: 'healthy',
    orbitType: 'GEO', altitude: 35786, inclination: 0, lat: 0, lng: -105,
    launchDate: '2023-11-20', mission: 'Broadcast Services',
    subsystems: [
      { name: 'Power System', key: 'power', healthScore: 88, status: 'healthy', sensors: [
        { name: 'Battery Voltage', unit: 'V', currentValue: 27.6, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
        { name: 'Solar Panel Output', unit: 'W', currentValue: 1190, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
        { name: 'Bus Current', unit: 'A', currentValue: 44.1, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
      ]},
      { name: 'Thermal Control', key: 'thermal', healthScore: 90, status: 'healthy', sensors: [
        { name: 'Internal Temp', unit: '°C', currentValue: 24.2, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
        { name: 'External Temp', unit: '°C', currentValue: -5.0, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
        { name: 'Radiator Temp', unit: '°C', currentValue: -2.1, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
      ]},
      { name: 'Communications', key: 'comms', healthScore: 96, status: 'healthy', sensors: [
        { name: 'Signal Strength', unit: 'dBm', currentValue: -60, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
        { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: 1.2, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
      ]},
      { name: 'Attitude Control', key: 'attitude', healthScore: 92, status: 'healthy', sensors: [
        { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 3050, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
        { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: 1.5, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
      ]},
    ],
  },
];

export const anomalyEvents: AnomalyEvent[] = [
  {
    id: 'anom-001', satelliteId: 'sat-312', satelliteName: 'ASTRA-312',
    timestamp: '2026-03-12T14:02:11Z', subsystem: 'Power System', sensor: 'Battery Voltage',
    anomalyScore: 92, severity: 'critical', resolved: true,
    rootCause: 'Thermal spike correlates with unexpected battery voltage drop. Primary battery cell degradation detected — probable micro-meteoroid impact on Panel Array B causing cascading power subsystem anomaly.',
    actionTaken: 'Auto-switched to Backup Battery B. Fault isolated and secondary redundancy activated.',
  },
  {
    id: 'anom-002', satelliteId: 'sat-312', satelliteName: 'ASTRA-312',
    timestamp: '2026-03-12T14:08:33Z', subsystem: 'Thermal Control', sensor: 'Internal Temp',
    anomalyScore: 78, severity: 'high', resolved: true,
    rootCause: 'Internal temperature exceeded normal operating range. Heat dissipation rate reduced due to partial radiator blockage. Correlates with power anomaly event anom-001.',
    actionTaken: 'Radiator adjustment executed. Thermal equilibrium restored within 4 minutes.',
  },
  {
    id: 'anom-003', satelliteId: 'sat-308', satelliteName: 'ASTRA-308',
    timestamp: '2026-03-12T13:45:20Z', subsystem: 'Power System', sensor: 'Solar Panel Output',
    anomalyScore: 61, severity: 'medium', resolved: false,
    rootCause: 'Solar panel output trending below expected curve. Possible partial shading from debris or degradation of photovoltaic cells. Monitoring for further decline.',
  },
  {
    id: 'anom-004', satelliteId: 'sat-308', satelliteName: 'ASTRA-308',
    timestamp: '2026-03-12T12:30:05Z', subsystem: 'Attitude Control', sensor: 'Reaction Wheel RPM',
    anomalyScore: 45, severity: 'low', resolved: false,
    rootCause: 'Reaction wheel operating near lower boundary. Bearing friction increase detected. Recommend scheduling maintenance window.',
  },
  {
    id: 'anom-005', satelliteId: 'sat-312', satelliteName: 'ASTRA-312',
    timestamp: '2026-03-12T10:15:42Z', subsystem: 'Communications', sensor: 'Bit Error Rate',
    anomalyScore: 55, severity: 'medium', resolved: true,
    rootCause: 'Elevated bit error rate during orbital transition through South Atlantic Anomaly. Expected environmental interference.',
    actionTaken: 'Switched to error-correcting transmission mode. BER normalized post-SAA transit.',
  },
  {
    id: 'anom-006', satelliteId: 'sat-301', satelliteName: 'ASTRA-301',
    timestamp: '2026-03-11T22:08:15Z', subsystem: 'Thermal Control', sensor: 'External Temp',
    anomalyScore: 38, severity: 'low', resolved: true,
    rootCause: 'Minor thermal fluctuation during eclipse entry. Within acceptable variance.',
    actionTaken: 'No action required. Logged for trend analysis.',
  },
];

export const rulPredictions: RULPrediction[] = [
  {
    componentName: 'Main Battery Pack', subsystem: 'Power System',
    currentHealth: 72, rulDays: 412, confidenceMargin: 15, degradationRate: 0.068, failureThreshold: 20,
    historicalData: Array.from({ length: 120 }, (_, i) => {
      const health = 100 - i * 0.068 * (1 + Math.random() * 0.3);
      return { day: i * 5, health: Math.max(health, 15), upper: Math.min(health + 5, 100), lower: Math.max(health - 5, 10) };
    }),
  },
  {
    componentName: 'Solar Panel Array A', subsystem: 'Power System',
    currentHealth: 85, rulDays: 890, confidenceMargin: 45, degradationRate: 0.035, failureThreshold: 25,
    historicalData: Array.from({ length: 120 }, (_, i) => {
      const health = 100 - i * 0.035 * (1 + Math.random() * 0.2);
      return { day: i * 7, health: Math.max(health, 20), upper: Math.min(health + 8, 100), lower: Math.max(health - 8, 15) };
    }),
  },
  {
    componentName: 'Reaction Wheel Assembly', subsystem: 'Attitude Control',
    currentHealth: 64, rulDays: 285, confidenceMargin: 22, degradationRate: 0.092, failureThreshold: 15,
    historicalData: Array.from({ length: 120 }, (_, i) => {
      const health = 100 - i * 0.092 * (1 + Math.random() * 0.25);
      return { day: i * 4, health: Math.max(health, 10), upper: Math.min(health + 6, 100), lower: Math.max(health - 6, 5) };
    }),
  },
  {
    componentName: 'S-Band Transponder', subsystem: 'Communications',
    currentHealth: 91, rulDays: 1450, confidenceMargin: 80, degradationRate: 0.018, failureThreshold: 30,
    historicalData: Array.from({ length: 120 }, (_, i) => {
      const health = 100 - i * 0.018 * (1 + Math.random() * 0.15);
      return { day: i * 10, health: Math.max(health, 25), upper: Math.min(health + 4, 100), lower: Math.max(health - 4, 20) };
    }),
  },
  {
    componentName: 'Thermal Radiator Panel', subsystem: 'Thermal Control',
    currentHealth: 78, rulDays: 520, confidenceMargin: 30, degradationRate: 0.052, failureThreshold: 20,
    historicalData: Array.from({ length: 120 }, (_, i) => {
      const health = 100 - i * 0.052 * (1 + Math.random() * 0.2);
      return { day: i * 6, health: Math.max(health, 15), upper: Math.min(health + 7, 100), lower: Math.max(health - 7, 10) };
    }),
  },
];

export const defaultAlertConfigs: AlertConfig[] = [
  { subsystem: 'Power System', sensitivity: 75, enabled: true, notifyEmail: true, notifySms: true },
  { subsystem: 'Thermal Control', sensitivity: 70, enabled: true, notifyEmail: true, notifySms: false },
  { subsystem: 'Communications', sensitivity: 60, enabled: true, notifyEmail: true, notifySms: false },
  { subsystem: 'Attitude Control', sensitivity: 65, enabled: true, notifyEmail: false, notifySms: false },
];

export function generateTelemetryStream(
  normalMin: number,
  normalMax: number,
  anomalyAt?: number[], // indices where anomalies occur
  points: number = 60
): TelemetryPoint[] {
  const data: TelemetryPoint[] = [];
  const range = normalMax - normalMin;
  const mid = (normalMax + normalMin) / 2;

  for (let i = 0; i < points; i++) {
    const t = i * 30; // 30-second intervals
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;
    const timeStr = `14:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const baseline = mid + Math.sin(i * 0.15) * (range * 0.2);
    const isAnomaly = anomalyAt?.includes(i) ?? false;
    let value: number;

    if (isAnomaly) {
      value = baseline + (Math.random() > 0.5 ? 1 : -1) * range * (0.8 + Math.random() * 0.5);
    } else {
      value = baseline + (Math.random() - 0.5) * range * 0.3;
    }

    data.push({
      time: timeStr,
      value: parseFloat(value.toFixed(2)),
      baseline: parseFloat(baseline.toFixed(2)),
      anomaly: isAnomaly,
    });
  }
  return data;
}
