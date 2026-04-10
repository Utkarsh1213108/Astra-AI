import { useQuery } from '@tanstack/react-query';

export interface LiveSatellitePosition {
  noradId: number;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  velocity: number | null;
  timestamp: number;
}

async function fetchLivePositions(): Promise<LiveSatellitePosition[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satellite-data?action=positions`,
    {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  if (!res.ok) throw new Error('Failed to fetch satellite positions');
  const json = await res.json();
  return json.positions || [];
}

export function useLiveSatellites() {
  return useQuery({
    queryKey: ['live-satellites'],
    queryFn: fetchLivePositions,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
