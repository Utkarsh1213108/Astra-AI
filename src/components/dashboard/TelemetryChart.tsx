import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useEffect, useState } from 'react';

interface TelemetryChartProps {
  title: string;
  color: string;
  anomaly?: boolean;
  dataRange?: { min: number; max: number };
  baseFrequency?: number;
}

const generateData = (min: number, max: number, freq: number, anomaly: boolean) => {
  const points = [];
  const hours = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
  for (let i = 0; i < hours.length; i++) {
    let value = (max + min) / 2 + Math.sin(i * freq) * ((max - min) / 3) + (Math.random() - 0.5) * ((max - min) / 4);
    if (anomaly && i >= 7 && i <= 9) {
      value = i === 8 ? max * 1.2 : max * 0.9;
    }
    points.push({ time: hours[i], value: parseFloat(value.toFixed(1)) });
  }
  return points;
};

const TelemetryChart = ({ title, color, anomaly = false, dataRange = { min: -20, max: 40 }, baseFrequency = 0.8 }: TelemetryChartProps) => {
  const [data, setData] = useState(() => generateData(dataRange.min, dataRange.max, baseFrequency, anomaly));

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = newData[newData.length - 1];
        const newVal = last.value + (Math.random() - 0.5) * 8;
        const [h, m] = last.time.split(':').map(Number);
        const newMin = m + 30 >= 60 ? (m + 30) - 60 : m + 30;
        const newHour = m + 30 >= 60 ? h + 1 : h;
        newData.push({ time: `${newHour}:${String(newMin).padStart(2, '0')}`, value: parseFloat(newVal.toFixed(1)) });
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <h3 className="font-heading text-sm font-semibold text-foreground mb-2 relative z-10">{title}</h3>
      {anomaly && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-destructive/20 border border-destructive text-destructive text-[10px] font-display px-2 py-0.5 rounded animate-pulse">
            ANOMALY
          </span>
        </div>
      )}
      <div className="h-32 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
            <XAxis dataKey="time" tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} axisLine={{ stroke: 'hsl(220 20% 18%)' }} />
            <YAxis tick={{ fill: 'hsl(215 16% 55%)', fontSize: 9 }} axisLine={{ stroke: 'hsl(220 20% 18%)' }} />
            {anomaly && <ReferenceLine y={dataRange.max * 0.85} stroke="hsl(0 72% 51%)" strokeDasharray="3 3" />}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TelemetryChart;
