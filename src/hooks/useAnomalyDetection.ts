import { useQuery } from '@tanstack/react-query';

export interface AnomalyDetectionResult {
  anomaly: boolean;
  score: number;
  threshold: number;
  window: number;
  channels: number;
  detected_points: number;
  detected_indices: number[];
  detector: string;
  max_score?: number;
  demo_index?: number;
  dataset?: string;
}

const API_URL = 'http://127.0.0.1:8001';

async function fetchAnomalyDetection(): Promise<AnomalyDetectionResult> {
  const response = await fetch(`${API_URL}/demo/s1`);

  if (!response.ok) {
    throw new Error('Failed to fetch anomaly detection result');
  }

  return response.json();
}

export function useAnomalyDetection() {
  return useQuery({
    queryKey: ['anomaly-detection', 's1'],
    queryFn: fetchAnomalyDetection,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}