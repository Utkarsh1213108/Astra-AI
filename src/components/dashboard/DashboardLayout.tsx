import { Link, useLocation } from 'react-router-dom';
import { Rocket, LayoutDashboard, Satellite, AlertTriangle, TrendingDown, Settings } from 'lucide-react';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { data: livePositions } = useLiveSatellites();
  const firstNoradId = livePositions?.[0]?.noradId ?? 25544;

  const navItems = [
    { path: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { path: `/satellite/norad-${firstNoradId}`, label: 'Telemetry', icon: Satellite },
    { path: '/anomalies', label: 'Anomaly Engine', icon: AlertTriangle },
    { path: '/rul', label: 'RUL Forecaster', icon: TrendingDown },
    { path: '/alerts', label: 'Alert Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="font-display text-sm text-primary text-glow-primary">ASTRA AI</span>
            <span className="text-muted-foreground text-[10px] font-display tracking-wider hidden sm:inline">MISSION CONTROL</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path.startsWith('/satellite') && location.pathname.startsWith('/satellite'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-heading font-semibold transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border-glow-primary border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
