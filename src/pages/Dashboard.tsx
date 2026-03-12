import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GlobeVisualization from '@/components/dashboard/GlobeVisualization';
import KPIWidgets from '@/components/dashboard/KPIWidgets';
import FleetStatusList from '@/components/dashboard/FleetStatusList';
import AlertsFeed from '@/components/dashboard/AlertsFeed';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <KPIWidgets />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 h-[50vh] min-h-[400px] bg-card border border-border rounded-lg overflow-hidden">
            <GlobeVisualization />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <FleetStatusList />
            <AlertsFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
