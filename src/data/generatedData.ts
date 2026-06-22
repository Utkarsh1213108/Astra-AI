import { Satellite, AnomalyEvent, RULPrediction, AlertConfig, TelemetryPoint, SubsystemHealth, SensorData } from './types';
import { LiveSatellitePosition } from '@/hooks/useLiveSatellites';

// Deterministic seed from norad ID for consistent generated values
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSensors(key: string, rng: () => number): SensorData[] {
  const sensorDefs: Record<string, SensorData[]> = {
    power: [
      { name: 'Battery Voltage', unit: 'V', currentValue: 26 + rng() * 4, normalMin: 26, normalMax: 30, criticalMin: 24, criticalMax: 32 },
      { name: 'Solar Panel Output', unit: 'W', currentValue: 900 + rng() * 500, normalMin: 1100, normalMax: 1400, criticalMin: 900, criticalMax: 1600 },
      { name: 'Bus Current', unit: 'A', currentValue: 30 + rng() * 25, normalMin: 35, normalMax: 50, criticalMin: 25, criticalMax: 60 },
    ],
    thermal: [
      { name: 'Internal Temp', unit: '°C', currentValue: 15 + rng() * 20, normalMin: 15, normalMax: 30, criticalMin: 5, criticalMax: 45 },
      { name: 'External Temp', unit: '°C', currentValue: -40 + rng() * 80, normalMin: -40, normalMax: 60, criticalMin: -80, criticalMax: 100 },
      { name: 'Radiator Temp', unit: '°C', currentValue: -20 + rng() * 25, normalMin: -20, normalMax: 10, criticalMin: -40, criticalMax: 25 },
    ],
    comms: [
      { name: 'Signal Strength', unit: 'dBm', currentValue: -80 + rng() * 30, normalMin: -80, normalMax: -50, criticalMin: -95, criticalMax: -30 },
      { name: 'Bit Error Rate', unit: '×10⁻⁶', currentValue: rng() * 15, normalMin: 0, normalMax: 10, criticalMin: 0, criticalMax: 50 },
    ],
    attitude: [
      { name: 'Reaction Wheel RPM', unit: 'RPM', currentValue: 2500 + rng() * 2000, normalMin: 2500, normalMax: 4000, criticalMin: 1500, criticalMax: 5000 },
      { name: 'Pointing Accuracy', unit: 'arcsec', currentValue: rng() * 5, normalMin: 0, normalMax: 3, criticalMin: 0, criticalMax: 10 },
    ],
  };
  return (sensorDefs[key] || sensorDefs.power).map(s => ({
    ...s,
    currentValue: parseFloat(s.currentValue.toFixed(1)),
  }));
}

function computeStatus(healthScore: number): 'healthy' | 'warning' | 'critical' {
  if (healthScore >= 80) return 'healthy';
  if (healthScore >= 50) return 'warning';
  return 'critical';
}

function generateSubsystems(rng: () => number): SubsystemHealth[] {
  const keys = ['power', 'thermal', 'comms', 'attitude'];
  const names = ['Power System', 'Thermal Control', 'Communications', 'Attitude Control'];
  return keys.map((key, i) => {
    const healthScore = Math.round(60 + rng() * 40);
    return {
      name: names[i],
      key,
      healthScore,
      status: computeStatus(healthScore),
      sensors: generateSensors(key, rng),
    };
  });
}

export function liveSatellitesToSatellites(positions: LiveSatellitePosition[]): Satellite[] {
  return positions.map((pos) => {
    const rng = seededRandom(pos.noradId);
    const subsystems = generateSubsystems(rng);
    const worstStatus = subsystems.reduce((worst, sub) => {
      if (sub.status === 'critical') return 'critical';
      if (sub.status === 'warning' && worst !== 'critical') return 'warning';
      return worst;
    }, 'healthy' as 'healthy' | 'warning' | 'critical');

    return {
      id: `norad-${pos.noradId}`,
      name: pos.name,
      noradId: String(pos.noradId),
      status: worstStatus,
      orbitType: (pos.altitude || 0) > 2000 ? 'MEO' : 'LEO',
      altitude: pos.altitude || 0,
      inclination: 0,
      lat: pos.lat,
      lng: pos.lng,
      launchDate: '',
      mission: 'Live Tracking',
      subsystems,
    };
  });
}

export function generateAnomalyEvents(satellites: Satellite[]): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];
  satellites.forEach((sat) => {
    const rng = seededRandom(parseInt(sat.noradId) || 1);
    sat.subsystems.forEach((sub) => {
      if (sub.status === 'warning' || sub.status === 'critical') {
        sub.sensors.forEach((sensor) => {
          const isOutOfRange = sensor.currentValue < sensor.normalMin || sensor.currentValue > sensor.normalMax;
          if (isOutOfRange) {
            const score = Math.round(40 + rng() * 55);
            events.push({
              id: `anom-${sat.noradId}-${sub.key}-${sensor.name.replace(/\s/g, '')}`,
              satelliteId: sat.id,
              satelliteName: sat.name,
              timestamp: new Date(Date.now() - rng() * 3600000 * 12).toISOString(),
              subsystem: sub.name,
              sensor: sensor.name,
              anomalyScore: score,
              severity: score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
              rootCause: `${sensor.name} reading of ${sensor.currentValue} ${sensor.unit} is outside normal range (${sensor.normalMin}–${sensor.normalMax} ${sensor.unit}). Automated analysis suggests potential ${sub.name.toLowerCase()} degradation.`,
              resolved: rng() > 0.5,
              actionTaken: rng() > 0.5 ? 'Automated recovery procedure initiated. Monitoring for further deviation.' : undefined,
            });
          }
        });
      }
    });
  });

  // Guarantee a non-empty anomaly feed for demo mode. If the deterministic
  // health model produced no out-of-range sensors, synthesize a baseline
  // anomaly per satellite so the Anomaly Engine and alerts always render.
  if (events.length === 0 && satellites.length > 0) {
    satellites.slice(0, Math.min(satellites.length, 6)).forEach((sat, idx) => {
      const rng = seededRandom((parseInt(sat.noradId) || 1) + 7919);
      const sub = sat.subsystems[idx % sat.subsystems.length];
      const sensor = sub.sensors[0];
      const score = Math.round(45 + rng() * 50);
      const severity: AnomalyEvent['severity'] =
        score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
      events.push({
        id: `anom-demo-${sat.noradId}-${sub.key}`,
        satelliteId: sat.id,
        satelliteName: sat.name,
        timestamp: new Date(Date.now() - idx * 1800_000 - rng() * 3600_000 * 6).toISOString(),
        subsystem: sub.name,
        sensor: sensor.name,
        anomalyScore: score,
        severity,
        rootCause: `Predictive model flagged ${sensor.name} drift on ${sat.name}. Pattern consistent with early-stage ${sub.name.toLowerCase()} degradation; no immediate operational impact.`,
        resolved: rng() > 0.6,
        actionTaken: rng() > 0.5 ? 'Telemetry baseline re-calibrated. Continuing extended monitoring.' : undefined,
      });
    });
  }

  return events;
}

export function generateRULPredictions(satellites: Satellite[]): RULPrediction[] {
  const components = [
    { componentName: 'Main Battery Pack', subsystem: 'Power System', key: 'power' },
    { componentName: 'Solar Panel Array', subsystem: 'Power System', key: 'power' },
    { componentName: 'Reaction Wheel Assembly', subsystem: 'Attitude Control', key: 'attitude' },
    { componentName: 'S-Band Transponder', subsystem: 'Communications', key: 'comms' },
    { componentName: 'Thermal Radiator Panel', subsystem: 'Thermal Control', key: 'thermal' },
  ];

  return components.map((comp, ci) => {
    const rng = seededRandom(ci * 1000 + (satellites.length || 1));
    const currentHealth = Math.round(55 + rng() * 40);
    const degradationRate = parseFloat((0.02 + rng() * 0.08).toFixed(3));
    const failureThreshold = 15 + Math.round(rng() * 15);
    const rulDays = Math.round((currentHealth - failureThreshold) / degradationRate);
    const confidenceMargin = Math.round(10 + rng() * 60);

    return {
      componentName: comp.componentName,
      subsystem: comp.subsystem,
      currentHealth,
      rulDays: Math.max(rulDays, 30),
      confidenceMargin,
      degradationRate,
      failureThreshold,
      historicalData: Array.from({ length: 120 }, (_, i) => {
        const health = 100 - i * degradationRate * (1 + rng() * 0.3);
        return {
          day: i * 5,
          health: Math.max(health, 10),
          upper: Math.min(health + 6, 100),
          lower: Math.max(health - 6, 5),
        };
      }),
    };
  });
}

export const defaultAlertConfigs: AlertConfig[] = [
  { subsystem: 'Power System', sensitivity: 75, enabled: true, notifyEmail: true, notifySms: true },
  { subsystem: 'Thermal Control', sensitivity: 70, enabled: true, notifyEmail: true, notifySms: false },
  { subsystem: 'Communications', sensitivity: 60, enabled: true, notifyEmail: true, notifySms: false },
  { subsystem: 'Attitude Control', sensitivity: 65, enabled: true, notifyEmail: false, notifySms: false },
];

export function generateTelemetryStream(
  normalMin: number,
  normalMax: number,
  anomalyAt?: number[],
  points: number = 60
): TelemetryPoint[] {
  const data: TelemetryPoint[] = [];
  const range = normalMax - normalMin;
  const mid = (normalMax + normalMin) / 2;

  for (let i = 0; i < points; i++) {
    const t = i * 30;
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
