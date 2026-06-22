import { useQuery } from '@tanstack/react-query';
import { getLocalFleet } from '@/data/localFleet';

const CACHE_KEY = 'astra:live-satellites:last';

export interface LiveSatellitePosition {
  noradId: number;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  velocity: number | null;
  timestamp: number;
  category?: string;
}

export interface OrbitTrailPoint {
  lat: number;
  lng: number;
  alt: number;
  timestamp: number;
}

export interface SatnogsMetadata {
  norad_cat_id: string;
  name: string;
  status: string;
  image?: string;
  description?: string;
  countries?: string;
  launched?: string;
  deployed?: string;
  decayed?: string;
}

export interface SatnogsTransmitter {
  uuid: string;
  description: string;
  alive: boolean;
  uplink_low: number | null;
  uplink_high: number | null;
  downlink_low: number | null;
  downlink_high: number | null;
  mode: string | null;
  baud: number | null;
  type: string;
  status: string;
}

async function fetchLivePositions(): Promise<LiveSatellitePosition[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/satellite-data?action=positions`,
      {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const positions: LiveSatellitePosition[] = json.positions || [];
    if (positions.length === 0) throw new Error('Empty positions');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(positions)); } catch {}
    return positions;
  } catch (err) {
    // Graceful degradation: prefer cached live data, else local demo fleet.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as LiveSatellitePosition[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return getLocalFleet();
  }
}

async function fetchOrbitTrail(noradId: number): Promise<OrbitTrailPoint[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satellite-data?action=orbit&norad_id=${noradId}&points=90`,
    {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  if (!res.ok) return [];
  const json = await res.json();
  return json.trail || [];
}

async function fetchSatnogsData(noradId: number): Promise<{ metadata: SatnogsMetadata | null; transmitters: SatnogsTransmitter[] }> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satellite-data?action=satnogs&norad_id=${noradId}`,
    {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  if (!res.ok) return { metadata: null, transmitters: [] };
  return await res.json();
}

export function useLiveSatellites() {
  return useQuery({
    queryKey: ['live-satellites'],
    queryFn: fetchLivePositions,
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    placeholderData: () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as LiveSatellitePosition[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      return getLocalFleet();
    },
  });
}

export function useOrbitTrail(noradId: number | null) {
  return useQuery({
    queryKey: ['orbit-trail', noradId],
    queryFn: () => fetchOrbitTrail(noradId!),
    enabled: !!noradId,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

export function useSatnogsData(noradId: number | null) {
  return useQuery({
    queryKey: ['satnogs', noradId],
    queryFn: () => fetchSatnogsData(noradId!),
    enabled: !!noradId,
    staleTime: 300000, // 5 min cache
  });
}
