import { LiveSatellitePosition } from '@/hooks/useLiveSatellites';

// Deterministic local demo fleet. Used when the live satellite API is
// unreachable or returns no data, so Telemetry, Anomaly Engine and
// RUL Forecaster always have realistic content to render.
const DEMO_FLEET: Omit<LiveSatellitePosition, 'lat' | 'lng' | 'timestamp'>[] = [
  { noradId: 25544, name: 'ISS (ZARYA)', altitude: 418, velocity: 7.66, category: 'station' },
  { noradId: 20580, name: 'HUBBLE SPACE TELESCOPE', altitude: 547, velocity: 7.59, category: 'science' },
  { noradId: 43013, name: 'NOAA 20', altitude: 825, velocity: 7.45, category: 'weather' },
  { noradId: 33591, name: 'NOAA 19', altitude: 870, velocity: 7.43, category: 'weather' },
  { noradId: 40069, name: 'METEOR-M 2', altitude: 825, velocity: 7.45, category: 'weather' },
  { noradId: 27424, name: 'AQUA', altitude: 705, velocity: 7.5, category: 'earth-obs' },
  { noradId: 25994, name: 'TERRA', altitude: 705, velocity: 7.5, category: 'earth-obs' },
  { noradId: 39084, name: 'LANDSAT 8', altitude: 705, velocity: 7.5, category: 'earth-obs' },
  { noradId: 49260, name: 'LANDSAT 9', altitude: 705, velocity: 7.5, category: 'earth-obs' },
  { noradId: 41866, name: 'GOES 16', altitude: 35786, velocity: 3.07, category: 'geostationary' },
];

export function getLocalFleet(): LiveSatellitePosition[] {
  const now = Date.now();
  // Stable but slowly-moving deterministic positions based on time + noradId.
  return DEMO_FLEET.map((s, i) => {
    const t = now / 1000;
    const lat = Math.sin(t / 600 + i) * 60;
    const lng = (((t / 60 + i * 36) % 360) + 540) % 360 - 180;
    return {
      ...s,
      lat,
      lng,
      timestamp: now,
    };
  });
}

export const LOCAL_FLEET_NORAD_IDS = DEMO_FLEET.map(s => s.noradId);