import { Satellite as SatIcon, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';
import { liveSatellitesToSatellites, generateAnomalyEvents } from '@/data/generatedData';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const KPIWidgets = () => {
  const { data: livePositions } = useLiveSatellites();

  const { totalSats, activeAnomalies, criticalAlerts, liveCount } = useMemo(() => {
    const sats = liveSatellitesToSatellites(livePositions || []);
    const events = generateAnomalyEvents(sats);
    return {
      totalSats: sats.length,
      activeAnomalies: events.filter(a => !a.resolved).length,
      criticalAlerts: sats.filter(s => s.status === 'critical').length,
      liveCount: sats.length,
    };
  }, [livePositions]);

  const kpis = [
    { label: 'Total Satellites', value: totalSats, icon: SatIcon, color: 'text-primary', glow: 'glow-primary', bg: 'bg-primary/10' },
    { label: 'Active Anomalies', value: activeAnomalies, icon: AlertTriangle, color: 'text-warning', glow: 'glow-warning', bg: 'bg-warning/10' },
    { label: 'Critical Alerts', value: criticalAlerts, icon: Activity, color: 'text-destructive', glow: 'glow-danger', bg: 'bg-destructive/10' },
    { label: 'Live Tracking', value: liveCount, icon: ShieldCheck, color: 'text-success', glow: 'glow-accent', bg: 'bg-success/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-card border border-border rounded-lg p-4 ${kpi.glow}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-[10px] font-display tracking-wider">{kpi.label}</span>
            <div className={`p-1.5 rounded ${kpi.bg}`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
          </div>
          <div className={`font-display text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default KPIWidgets;
