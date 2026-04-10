import { Link } from 'react-router-dom';
import { satellites } from '@/data/mockData';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';
import { motion } from 'framer-motion';
import { Satellite } from '@/data/types';

const statusColors = {
  healthy: { dot: 'bg-success', text: 'text-success', border: 'border-success/20', bg: 'hover:bg-success/5' },
  warning: { dot: 'bg-warning animate-pulse', text: 'text-warning', border: 'border-warning/20', bg: 'hover:bg-warning/5' },
  critical: { dot: 'bg-destructive animate-pulse', text: 'text-destructive', border: 'border-destructive/20', bg: 'hover:bg-destructive/5' },
};

const FleetStatusList = () => {
  const { data: livePositions } = useLiveSatellites();

  // Convert live positions to Satellite-like objects
  const liveSats: Satellite[] = (livePositions || []).map((pos) => ({
    id: `norad-${pos.noradId}`,
    name: pos.name,
    noradId: String(pos.noradId),
    status: 'healthy' as const,
    orbitType: 'LEO',
    altitude: pos.altitude || 0,
    inclination: 0,
    lat: pos.lat,
    lng: pos.lng,
    launchDate: '',
    mission: 'Live Tracking',
    subsystems: [],
  }));

  const allSats = [...satellites, ...liveSats];
  const sorted = allSats.sort((a, b) => {
    const order = { critical: 0, warning: 1, healthy: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="font-display text-[10px] tracking-wider text-primary">FLEET STATUS</span>
        {liveSats.length > 0 && (
          <span className="ml-2 text-[9px] text-success font-display">
            {liveSats.length} LIVE
          </span>
        )}
      </div>
      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
        {sorted.map((sat, i) => {
          const sc = statusColors[sat.status];
          const isLive = sat.id.startsWith('norad-');
          return (
            <motion.div
              key={sat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/satellite/${sat.id}`}
                className={`flex items-center justify-between px-4 py-3 ${sc.bg} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : sc.dot}`} />
                  <div>
                    <div className="font-heading text-sm font-semibold text-foreground">
                      {sat.name}
                      {isLive && <span className="ml-1 text-[9px] text-success">● LIVE</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {sat.mission} · {sat.orbitType} · {Math.round(sat.altitude)}km
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-display text-[10px] tracking-wider uppercase ${isLive ? 'text-success' : sc.text}`}>
                    {isLive ? 'TRACKING' : sat.status}
                  </span>
                  {sat.subsystems.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Health: {Math.round(sat.subsystems.reduce((a, s) => a + s.healthScore, 0) / sat.subsystems.length)}%
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FleetStatusList;
