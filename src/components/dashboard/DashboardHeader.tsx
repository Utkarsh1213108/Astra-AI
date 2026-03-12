import { Rocket } from 'lucide-react';

const DashboardHeader = () => (
  <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
    <div>
      <h1 className="font-display text-sm tracking-widest text-foreground">
        ASTRA AI: <span className="text-muted-foreground font-heading text-base">AUTONOMOUS SATELLITE HEALTH AUTOPILOT</span>
      </h1>
    </div>
    <div className="flex items-center gap-2">
      <Rocket className="w-5 h-5 text-primary" />
      <div className="text-right">
        <div className="font-display text-sm text-primary text-glow-primary">Astra AI</div>
        <div className="text-[10px] text-muted-foreground tracking-wider">Space Solutions</div>
      </div>
    </div>
  </header>
);

export default DashboardHeader;
