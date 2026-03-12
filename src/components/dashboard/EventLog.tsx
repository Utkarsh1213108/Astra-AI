import { useEffect, useState } from 'react';

const events = [
  { time: '14:02:11', type: 'anomaly', label: 'ANOMALY IDENTIFIED:', detail: 'Power Subsystem' },
  { time: '14:02:20', type: 'action', label: 'AUTO-SWITCH:', detail: 'Backup Battery B [SUCCESS]' },
  { time: '14:02:48', type: 'clear', label: 'Alert cleared.', detail: 'Normalizing parameters.' },
  { time: '14:05:33', type: 'info', label: 'TELEMETRY:', detail: 'All systems nominal' },
  { time: '14:08:12', type: 'anomaly', label: 'TEMP SPIKE:', detail: 'Solar Panel Array C' },
  { time: '14:08:15', type: 'action', label: 'THERMAL CTRL:', detail: 'Radiator adjustment [SUCCESS]' },
];

const EventLog = () => {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount(prev => Math.min(prev + 1, events.length));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const typeColors = {
    anomaly: 'text-destructive',
    action: 'text-primary',
    clear: 'text-success',
    info: 'text-muted-foreground',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-5" />
      <div className="relative z-10 space-y-1.5 max-h-24 overflow-y-auto scrollbar-thin">
        {events.slice(0, visibleCount).map((e, i) => (
          <div key={i} className="flex gap-2 text-[11px] font-body leading-tight animate-in fade-in slide-in-from-bottom-1">
            <span className="text-muted-foreground font-mono shrink-0">{e.time}</span>
            <span className={`font-semibold ${typeColors[e.type as keyof typeof typeColors]}`}>{e.label}</span>
            <span className="text-foreground/70">{e.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;
