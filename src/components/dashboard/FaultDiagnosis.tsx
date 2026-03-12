import { useEffect, useState } from 'react';

const FaultDiagnosis = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1500),
      setTimeout(() => setStage(2), 3000),
      setTimeout(() => setStage(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-5" />
      <div className="relative z-10 space-y-3">
        <div className="text-center">
          <h3 className="font-display text-xs tracking-wider text-muted-foreground">FAULT DIAGNOSIS</h3>
          <div className="mt-2 bg-destructive/20 border border-destructive rounded px-3 py-1.5 glow-danger inline-block">
            <span className="font-display text-sm text-destructive font-bold animate-pulse">ANOMALY DETECTED</span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <h3 className="font-display text-xs tracking-wider text-muted-foreground mb-2">AUTONOMOUS REMEDIAL ACTION</h3>
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 space-y-2 glow-accent">
            <Step label="FAULT ISOLATION" status={stage >= 1 ? 'COMPLETED' : 'PENDING'} active={stage >= 1} />
            <Arrow visible={stage >= 1} />
            <Step label="SECONDARY REDUNDANCY ACTIVATED" status={stage >= 2 ? 'EXECUTED' : 'PENDING'} active={stage >= 2} />
            <Arrow visible={stage >= 2} />
            <StepFinal label="SAT STATUS:" value={stage >= 3 ? 'RESTORED & OPERATIONAL' : 'PROCESSING...'} active={stage >= 3} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({ label, status, active }: { label: string; status: string; active: boolean }) => (
  <div className={`border rounded px-3 py-2 text-center transition-all duration-500 ${
    active ? 'border-success/50 bg-success/10' : 'border-border bg-secondary/30'
  }`}>
    <div className="font-heading text-xs font-semibold text-foreground">{label}</div>
    <div className={`font-display text-[10px] ${active ? 'text-success' : 'text-muted-foreground'}`}>[{status}]</div>
  </div>
);

const StepFinal = ({ label, value, active }: { label: string; value: string; active: boolean }) => (
  <div className={`border rounded px-3 py-2 text-center transition-all duration-500 ${
    active ? 'border-success/50 bg-success/10' : 'border-border bg-secondary/30'
  }`}>
    <span className="font-heading text-xs font-semibold text-foreground">{label} </span>
    <span className={`font-display text-xs font-bold ${active ? 'text-success text-glow-accent' : 'text-muted-foreground'}`}>{value}</span>
  </div>
);

const Arrow = ({ visible }: { visible: boolean }) => (
  <div className={`text-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-30'}`}>
    <span className="text-success text-lg">↓</span>
  </div>
);

export default FaultDiagnosis;
