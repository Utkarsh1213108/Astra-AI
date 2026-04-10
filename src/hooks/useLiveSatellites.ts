import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase.functions.invoke('satellite-data', {
    body: null,
    method: 'GET',
  });

  // supabase.functions.invoke doesn't support query params well for GET,
  // so we use fetch directly
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/satellite-data?action=positions`,
    {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });
}
