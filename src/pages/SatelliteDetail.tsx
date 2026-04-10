import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';
import { liveSatellitesToSatellites, generateTelemetryStream } from '@/data/generatedData';
import { TelemetryPoint } from '@/data/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Area, ComposedChart, ReferenceLine, ReferenceArea, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Thermometer, Radio, RotateCw } from 'lucide-react';

const subsystemIcons: Record<string, typeof Activity> = {
  power: Activity,
  thermal: Thermometer,
  comms: Radio,
  attitude: RotateCw,
};

const SatelliteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: livePositions } = useLiveSatellites();
  const satellites = useMemo(() => liveSatellitesToSatellites(livePositions || []), [livePositions]);
  const sat = satellites.find(s => s.id === id);
  const [activeSubsystem, setActiveSubsystem] = useState('power');
  const [telemetryData, setTelemetryData] = useState<Record<string, TelemetryPoint[]>>({});

  const subsystem = sat?.subsystems.find(s => s.key === activeSubsystem);

  useEffect(() => {
    if (!subsystem) return;
    const data: Record<string, TelemetryPoint[]> = {};
    subsystem.sensors.forEach(sensor => {
      const anomalyIndices = sat?.status === 'critical' && activeSubsystem === 'power'
        ? [35, 36, 37, 38, 39]
        : sat?.status === 'warning' ? [42, 43] : undefined;
      data[sensor.name] = generateTelemetryStream(sensor.normalMin, sensor.normalMax, anomalyIndices);
    });
    setTelemetryData(data);
  }, [subsystem, activeSubsystem, sat]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key]?.length > 0) {
            const arr = [...updated[key]];
            const last = arr[arr.length - 1];
            const newVal = last.baseline + (Math.random() - 0.5) * Math.abs(last.baseline) * 0.3;
            arr.push({
              time: `14:${String(arr.length).padStart(2, '0')}:00`,
              value: parseFloat(newVal.toFixed(2)),
              baseline: last.baseline + Math.sin(arr.length * 0.15) * 0.5,
              anomaly: false,
            });
            if (arr.length > 70) arr.shift();
            updated[key] = arr;
          }
        });
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!sat) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Satellite not found. Waiting for live data...</p>
          <Link to="/dashboard" className="text-primary underline text-sm">Back to Command Center</Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor = sat.status === 'critical' ? 'text-destructive' : sat.status === 'warning' ? 'text-warning' : 'text-success';

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg text-foreground">{sat.name}</h1>
              <p className="text-[11px] text-muted-foreground">{sat.mission} · {sat.orbitType} · {Math.round(sat.altitude)}km · NORAD {sat.noradId}</p>
            </div>
          </div>
          <span className={`font-display text-xs tracking-wider uppercase ${statusColor}`}>
            {sat.status}
          </span>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {sat.subsystems.map(sub => {
            const Icon = subsystemIcons[sub.key] || Activity;
            const sc = sub.status === 'critical' ? 'border-destructive/30 text-destructive' : sub.status === 'warning' ? 'border-warning/30 text-warning' : 'border-success/30 text-success';
            return (
              <motion.button
                key={sub.key}
                onClick={() => setActiveSubsystem(sub.key)}
                className={`bg-card border rounded-lg p-3 text-left transition-all ${
                  activeSubsystem === sub.key ? `${sc} border-glow-primary` : 'border-border hover:border-primary/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-heading text-xs font-semibold text-foreground">{sub.name}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className={`font-display text-2xl font-bold ${sc.split(' ')[1]}`}>{sub.healthScore}%</span>
                  <span className={`font-display text-[9px] tracking-wider uppercase ${sc.split(' ')[1]}`}>{sub.status}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <Tabs value={activeSubsystem} onValueChange={setActiveSubsystem}>
          <TabsList className="bg-card border border-border">
            {sat.subsystems.map(sub => (
              <TabsTrigger key={sub.key} value={sub.key} className="font-display text-[10px] tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                {sub.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {sat.subsystems.map(sub => (
            <TabsContent key={sub.key} value={sub.key} className="space-y-4 mt-4">
              {sub.sensors.map(sensor => {
                const data = telemetryData[sensor.name] || [];
                const anomalyPoints = data.filter(d => d.anomaly);
                return (
                  <motion.div
                    key={sensor.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-foreground">{sensor.name}</h3>
                        <span className="text-[10px] text-muted-foreground">
                          Current: <span className="text-foreground">{sensor.currentValue} {sensor.unit}</span>
                          {' · '}Normal: {sensor.normalMin}–{sensor.normalMax} {sensor.unit}
                        </span>
                      </div>
                      {anomalyPoints.length > 0 && (
                        <span className="font-display text-[9px] bg-destructive/20 text-destructive border border-destructive/30 px-2 py-0.5 rounded animate-pulse">
                          {anomalyPoints.length} ANOMALIES DETECTED
                        </span>
                      )}
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                          <XAxis dataKey="time" tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} interval={9} />
                          <YAxis tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} domain={[sensor.criticalMin, sensor.criticalMax]} />
                          <Tooltip
                            contentStyle={{ background: 'hsl(220 25% 10%)', border: '1px solid hsl(220 20% 18%)', borderRadius: 8, fontSize: 11 }}
                            labelStyle={{ color: 'hsl(215 16% 55%)' }}
                          />
                          <ReferenceArea y1={sensor.normalMin} y2={sensor.normalMax} fill="hsl(150 80% 45%)" fillOpacity={0.05} />
                          <ReferenceLine y={sensor.criticalMax} stroke="hsl(0 72% 51%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <ReferenceLine y={sensor.criticalMin} stroke="hsl(0 72% 51%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <Line type="monotone" dataKey="baseline" stroke="hsl(215 16% 55%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Expected" />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(199 89% 48%)"
                            strokeWidth={1.5}
                            dot={(props: any) => {
                              const { cx, cy, payload } = props;
                              if (payload?.anomaly) {
                                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="hsl(0 72% 51%)" stroke="hsl(0 72% 51%)" strokeWidth={2} opacity={0.8} />;
                              }
                              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;
                            }}
                            name="Live"
                          />
                          {anomalyPoints.map((_, idx) => {
                            const dataIdx = data.findIndex(d => d.anomaly && data.filter((dd, ii) => dd.anomaly && ii <= data.indexOf(d)).length === idx + 1);
                            if (dataIdx >= 0) {
                              return <ReferenceLine key={`anom-${idx}`} x={data[dataIdx].time} stroke="hsl(0 72% 51%)" strokeWidth={1} strokeOpacity={0.4} />;
                            }
                            return null;
                          })}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Live Data</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-muted-foreground inline-block border-dashed" style={{ borderTop: '1px dashed' }} /> Expected Baseline</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/20 inline-block" /> Normal Range</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Anomaly</span>
                    </div>
                  </motion.div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SatelliteDetail;
