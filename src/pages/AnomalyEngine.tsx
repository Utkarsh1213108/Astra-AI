import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { anomalyEvents, satellites } from '@/data/mockData';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const severityColors = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
  high: { bg: 'bg-warning/20', text: 'text-warning', border: 'border-warning/50' },
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
};

const AnomalyEngine = () => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterSatellite, setFilterSatellite] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = anomalyEvents.filter(e => {
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    if (filterSatellite !== 'all' && e.satelliteId !== filterSatellite) return false;
    if (searchTerm && !e.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) && !e.sensor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="font-display text-lg text-foreground">Anomaly Detection Engine</h1>
          <p className="text-xs text-muted-foreground">AI-powered anomaly identification with root cause analysis</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search subsystem or sensor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-card border-border text-sm"
            />
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px] h-9 bg-card border-border text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSatellite} onValueChange={setFilterSatellite}>
            <SelectTrigger className="w-[160px] h-9 bg-card border-border text-xs">
              <SelectValue placeholder="Satellite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Satellites</SelectItem>
              {satellites.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Anomaly Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Timestamp', 'Satellite', 'Subsystem', 'Sensor', 'Score', 'Severity', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-display text-[10px] tracking-wider text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, i) => {
                  const sc = severityColors[event.severity];
                  const isExpanded = expandedId === event.id;
                  return (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-heading font-semibold text-foreground">{event.satelliteName}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{event.subsystem}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.sensor}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${event.anomalyScore >= 80 ? 'bg-destructive' : event.anomalyScore >= 50 ? 'bg-warning' : 'bg-primary'}`}
                              style={{ width: `${event.anomalyScore}%` }}
                            />
                          </div>
                          <span className={`text-xs font-display ${sc.text}`}>{event.anomalyScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-display text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {event.resolved ? (
                          <span className="font-display text-[9px] text-success bg-success/10 px-2 py-0.5 rounded">RESOLVED</span>
                        ) : (
                          <span className="font-display text-[9px] text-warning bg-warning/10 px-2 py-0.5 rounded animate-pulse">ACTIVE</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Root Cause Detail Panel */}
        {expandedId && (() => {
          const event = anomalyEvents.find(e => e.id === expandedId);
          if (!event) return null;
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-card border border-primary/20 rounded-lg p-5 glow-primary"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display text-xs tracking-wider text-primary">ROOT CAUSE ANALYSIS</h3>
                  <span className="text-[10px] text-muted-foreground">{event.satelliteName} · {event.subsystem} · {event.sensor}</span>
                </div>
                <span className={`font-display text-[10px] ${severityColors[event.severity].text}`}>
                  Score: {event.anomalyScore}/100
                </span>
              </div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-3">
                <p className="text-sm text-foreground leading-relaxed font-body">{event.rootCause}</p>
              </div>
              {event.actionTaken && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                  <span className="font-display text-[10px] text-success tracking-wider">ACTION TAKEN</span>
                  <p className="text-sm text-foreground mt-1 font-body">{event.actionTaken}</p>
                </div>
              )}
            </motion.div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
};

export default AnomalyEngine;
