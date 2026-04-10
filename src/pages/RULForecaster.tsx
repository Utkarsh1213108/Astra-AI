import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';
import { liveSatellitesToSatellites, generateRULPredictions } from '@/data/generatedData';
import { RULPrediction } from '@/data/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Area, ComposedChart, ReferenceLine, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { Clock, TrendingDown, AlertTriangle } from 'lucide-react';

const RULForecaster = () => {
  const { data: livePositions } = useLiveSatellites();
  const satellites = useMemo(() => liveSatellitesToSatellites(livePositions || []), [livePositions]);
  const rulPredictions = useMemo(() => generateRULPredictions(satellites), [satellites]);
  const [selected, setSelected] = useState<RULPrediction | null>(null);

  const active = selected || rulPredictions[0];

  if (!active) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Loading satellite data...</div>
      </DashboardLayout>
    );
  }

  const healthColor = (h: number) => h >= 80 ? 'text-success' : h >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="font-display text-lg text-foreground">Remaining Useful Life Forecaster</h1>
          <p className="text-xs text-muted-foreground">Predictive maintenance powered by deep learning degradation models</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {rulPredictions.map((rul, i) => (
            <motion.button
              key={rul.componentName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(rul)}
              className={`bg-card border rounded-lg p-4 text-left transition-all ${
                active.componentName === rul.componentName ? 'border-primary/50 glow-primary' : 'border-border hover:border-primary/20'
              }`}
            >
              <div className="text-[10px] text-muted-foreground font-display tracking-wider mb-1">{rul.subsystem}</div>
              <div className="font-heading text-sm font-semibold text-foreground mb-2">{rul.componentName}</div>
              <div className={`font-display text-xl font-bold ${healthColor(rul.currentHealth)}`}>{rul.currentHealth}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">RUL: {rul.rulDays} days</div>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            key={active.componentName + '-countdown'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-display text-[10px] tracking-wider text-primary">RUL COUNTDOWN</span>
            </div>
            <div className="text-center space-y-3">
              <div className={`font-display text-5xl font-bold ${healthColor(active.currentHealth)}`}>
                {active.rulDays}
              </div>
              <div className="text-muted-foreground text-sm">Days Remaining</div>
              <div className={`text-xs font-heading ${healthColor(active.currentHealth)}`}>
                ± {active.confidenceMargin} days confidence interval
              </div>
              <div className="border-t border-border pt-3 mt-3 space-y-2 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Component</span>
                  <span className="text-foreground font-heading">{active.componentName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subsystem</span>
                  <span className="text-foreground font-heading">{active.subsystem}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Current Health</span>
                  <span className={`font-heading font-semibold ${healthColor(active.currentHealth)}`}>{active.currentHealth}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Degradation Rate</span>
                  <span className="text-foreground font-heading">{active.degradationRate}%/day</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Failure Threshold</span>
                  <span className="text-destructive font-heading">{active.failureThreshold}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            key={active.componentName + '-curve'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg p-5 lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span className="font-display text-[10px] tracking-wider text-primary">DEGRADATION CURVE</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={active.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} label={{ value: 'Days', position: 'bottom', fill: 'hsl(215 16% 55%)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} domain={[0, 105]} label={{ value: 'Health %', angle: -90, position: 'insideLeft', fill: 'hsl(215 16% 55%)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(220 25% 10%)', border: '1px solid hsl(220 20% 18%)', borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(199 89% 48%)" fillOpacity={0.08} name="Upper CI" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(220 25% 10%)" fillOpacity={1} name="Lower CI" />
                  <Area type="monotone" dataKey="health" stroke="none" fill="hsl(199 89% 48%)" fillOpacity={0.1} />
                  <ReferenceLine y={active.failureThreshold} stroke="hsl(0 72% 51%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: 'Failure Threshold', fill: 'hsl(0 72% 51%)', fontSize: 9, position: 'right' }} />
                  <Line type="monotone" dataKey="health" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={false} name="Health Score" />
                  <Line type="monotone" dataKey="upper" stroke="hsl(199 89% 48%)" strokeWidth={0.5} strokeDasharray="3 3" dot={false} name="Upper Bound" />
                  <Line type="monotone" dataKey="lower" stroke="hsl(199 89% 48%)" strokeWidth={0.5} strokeDasharray="3 3" dot={false} name="Lower Bound" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Health Score</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-primary inline-block" /> Confidence Bounds</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block border-dashed" /> Failure Threshold</span>
            </div>
          </motion.div>
        </div>

        {active.rulDays < 350 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-warning/5 border border-warning/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="font-display text-xs text-warning tracking-wider">MAINTENANCE ADVISORY</div>
              <p className="text-sm text-foreground mt-1">
                {active.componentName} predicted failure within {active.rulDays} ± {active.confidenceMargin} days.
                Schedule preventive maintenance or prepare replacement unit. Current degradation rate: {active.degradationRate}%/day.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RULForecaster;
