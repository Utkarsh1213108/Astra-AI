import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';
import { liveSatellitesToSatellites, generateAnomalyEvents, generateRULPredictions, defaultAlertConfigs } from '@/data/generatedData';
import { AlertConfig } from '@/data/types';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Settings, Download, FileText, Bell, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const AlertConfigPage = () => {
  const { data: livePositions } = useLiveSatellites();
  const satellites = useMemo(() => liveSatellitesToSatellites(livePositions || []), [livePositions]);
  const anomalyEvents = useMemo(() => generateAnomalyEvents(satellites), [satellites]);
  const rulPredictions = useMemo(() => generateRULPredictions(satellites), [satellites]);

  const [configs, setConfigs] = useState<AlertConfig[]>(defaultAlertConfigs);

  const updateConfig = (index: number, updates: Partial<AlertConfig>) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const exportCSV = () => {
    const headers = ['Satellite,Status,Subsystem,Health Score,Active Anomalies'];
    const rows = satellites.flatMap(sat =>
      sat.subsystems.map(sub => {
        const anomCount = anomalyEvents.filter(a => a.satelliteId === sat.id && a.subsystem === sub.name && !a.resolved).length;
        return `${sat.name},${sat.status},${sub.name},${sub.healthScore},${anomCount}`;
      })
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-ai-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report downloaded successfully');
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(14, 165, 233);
    doc.text('ASTRA AI — Health Status Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('Fleet Summary', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Satellite', 'Status', 'Overall Health', 'Mission', 'Orbit']],
      body: satellites.map(s => [
        s.name,
        s.status.toUpperCase(),
        `${Math.round(s.subsystems.reduce((a, sub) => a + sub.healthScore, 0) / s.subsystems.length)}%`,
        s.mission,
        `${s.orbitType} ${Math.round(s.altitude)}km`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    });

    const lastY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text('Active Anomalies', 14, lastY + 12);

    const activeAnomalies = anomalyEvents.filter(a => !a.resolved);
    autoTable(doc, {
      startY: lastY + 16,
      head: [['Satellite', 'Subsystem', 'Sensor', 'Score', 'Severity']],
      body: activeAnomalies.map(a => [
        a.satelliteName, a.subsystem, a.sensor, String(a.anomalyScore), a.severity.toUpperCase(),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    });

    const lastY2 = (doc as any).lastAutoTable?.finalY || 160;
    doc.text('RUL Predictions', 14, lastY2 + 12);

    autoTable(doc, {
      startY: lastY2 + 16,
      head: [['Component', 'Subsystem', 'Health', 'RUL (Days)', 'Confidence']],
      body: rulPredictions.map(r => [
        r.componentName, r.subsystem, `${r.currentHealth}%`, String(r.rulDays), `± ${r.confidenceMargin} days`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    });

    doc.save(`astra-ai-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report downloaded successfully');
  };

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="font-display text-lg text-foreground">Alert Configuration & Reporting</h1>
          <p className="text-xs text-muted-foreground">Manage detection sensitivity and export operational reports</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-4 h-4 text-primary" />
            <span className="font-display text-[10px] tracking-wider text-primary">ANOMALY DETECTION THRESHOLDS</span>
          </div>
          <div className="space-y-6">
            {configs.map((config, i) => (
              <motion.div
                key={config.subsystem}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="border-b border-border pb-5 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={config.enabled} onCheckedChange={v => updateConfig(i, { enabled: v })} />
                    <span className="font-heading text-sm font-semibold text-foreground">{config.subsystem}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateConfig(i, { notifyEmail: !config.notifyEmail })}
                      className={`p-1.5 rounded transition-colors ${config.notifyEmail ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Email notifications"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateConfig(i, { notifySms: !config.notifySms })}
                      className={`p-1.5 rounded transition-colors ${config.notifySms ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title="SMS notifications"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground w-16">Sensitivity</span>
                  <div className="flex-1">
                    <Slider value={[config.sensitivity]} onValueChange={v => updateConfig(i, { sensitivity: v[0] })} min={10} max={100} step={5} disabled={!config.enabled} className="w-full" />
                  </div>
                  <span className={`font-display text-sm w-12 text-right ${
                    config.sensitivity >= 80 ? 'text-destructive' : config.sensitivity >= 50 ? 'text-warning' : 'text-success'
                  }`}>
                    {config.sensitivity}%
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">
                  <span>Less Sensitive (fewer alerts)</span>
                  <span>More Sensitive (more alerts)</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => toast.success('Alert configurations saved')} className="font-display text-xs tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
              <Bell className="w-3.5 h-3.5 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-display text-[10px] tracking-wider text-primary">REPORT GENERATION</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Export the current fleet health status, recent anomalies, and RUL predictions for engineering review.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportCSV} className="bg-secondary/30 border border-border rounded-lg p-4 text-left hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-primary" />
                <span className="font-heading text-sm font-semibold text-foreground">Export CSV</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Raw data export for spreadsheet analysis. Includes all subsystem health scores and anomaly counts.</p>
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportPDF} className="bg-secondary/30 border border-border rounded-lg p-4 text-left hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-heading text-sm font-semibold text-foreground">Export PDF Report</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Formatted report with fleet summary, active anomalies, and RUL predictions. Ready for engineering review.</p>
            </motion.button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AlertConfigPage;
