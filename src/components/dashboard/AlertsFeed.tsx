import { anomalyEvents } from '@/data/mockData';
import { motion } from 'framer-motion';

const severityColors = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-warning',
  critical: 'text-destructive',
};

const AlertsFeed = () => {
  const sorted = [...anomalyEvents].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-display text-[10px] tracking-wider text-primary">RECENT ALERTS</span>
        <span className="text-[10px] text-muted-foreground">{sorted.length} events</span>
      </div>
      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
        {sorted.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            className="px-4 py-3"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`font-display text-[10px] tracking-wider uppercase ${severityColors[event.severity]}`}>
                  {event.severity}
                </span>
                <span className="text-foreground text-xs font-heading font-semibold">{event.satelliteName}</span>
              </div>
              <div className="flex items-center gap-2">
                {event.resolved && (
                  <span className="text-[9px] font-display text-success bg-success/10 px-1.5 py-0.5 rounded">RESOLVED</span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {event.subsystem} → {event.sensor} · Score: <span className={severityColors[event.severity]}>{event.anomalyScore}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AlertsFeed;
