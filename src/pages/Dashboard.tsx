import DashboardHeader from '@/components/dashboard/DashboardHeader';
import TelemetryChart from '@/components/dashboard/TelemetryChart';
import ConstellationMap from '@/components/dashboard/ConstellationMap';
import FaultDiagnosis from '@/components/dashboard/FaultDiagnosis';
import EventLog from '@/components/dashboard/EventLog';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="p-4 grid grid-cols-12 gap-3 max-h-[calc(100vh-56px)] overflow-auto">
        {/* Left Column - Telemetry */}
        <div className="col-span-3 space-y-3">
          <TelemetryChart title="Telemetry: Temperature" color="hsl(199, 89%, 48%)" dataRange={{ min: -10, max: 40 }} />
          <TelemetryChart title="Voltage: Voltage" color="hsl(150, 80%, 45%)" anomaly dataRange={{ min: 300, max: 1500 }} baseFrequency={1.2} />
          <TelemetryChart title="Bus Current (Value)" color="hsl(199, 70%, 60%)" dataRange={{ min: 10, max: 120 }} baseFrequency={0.6} />
          <TelemetryChart title="Bus Current (Variant)" color="hsl(150, 60%, 50%)" dataRange={{ min: -30, max: 130 }} baseFrequency={0.9} />
        </div>

        {/* Center - Constellation Map + Fault Diagnosis */}
        <div className="col-span-6 space-y-3">
          <div className="h-[45vh]">
            <ConstellationMap />
          </div>
          <FaultDiagnosis />
          <EventLog />
        </div>

        {/* Right Column - Telemetry */}
        <div className="col-span-3 space-y-3">
          <TelemetryChart title="Telemetry: Voltage" color="hsl(199, 89%, 48%)" dataRange={{ min: -30, max: 30 }} baseFrequency={1.5} />
          <TelemetryChart title="Voltage: Voltage" color="hsl(150, 80%, 45%)" dataRange={{ min: 0, max: 1600 }} baseFrequency={0.7} />
          <TelemetryChart title="Bus Current (Design)" color="hsl(199, 70%, 60%)" dataRange={{ min: 0, max: 400 }} baseFrequency={1.1} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
