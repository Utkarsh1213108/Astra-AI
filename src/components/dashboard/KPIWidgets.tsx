import { Satellite as SatIcon, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { satellites, anomalyEvents } from '@/data/mockData';
import { motion } from 'framer-motion';

const KPIWidgets = () => {
  const totalSats = satellites.length;
  const activeAnomalies = anomalyEvents.filter(a => !a.resolved).length;
  const criticalAlerts = satellites.filter(s => s.status === 'critical').length;
  const healthySats = satellites.filter(s => s.status === 'healthy').length;

  const kpis = [
    { label: 'Total Satellites', value: totalSats, icon: SatIcon, color: 'text-primary', glow: 'glow-primary', bg: 'bg-primary/10' },
    { label: 'Active Anomalies', value: activeAnomalies, icon: AlertTriangle, color: 'text-warning', glow: 'glow-warning', bg: 'bg-warning/10' },
    { label: 'Critical Alerts', value: criticalAlerts, icon: Activity, color: 'text-destructive', glow: 'glow-danger', bg: 'bg-destructive/10' },
    { label: 'Healthy Systems', value: healthySats, icon: ShieldCheck, color: 'text-success', glow: 'glow-accent', bg: 'bg-success/10' },
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
