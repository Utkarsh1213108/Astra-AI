import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, useTexture, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useLiveSatellites, useOrbitTrail, LiveSatellitePosition } from '@/hooks/useLiveSatellites';
import earthTexture from '@/assets/earth-texture.jpg';
import { X, Battery, Thermometer, Mountain, Brain, AlertTriangle, ExternalLink, Radio, Activity, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ───────────────────────── helpers ───────────────────────── */

function latLngToVec3(lat: number, lng: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

function seeded(noradId: number, salt = 0) {
  let s = (noradId || 1) + salt * 7919;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type HealthState = 'healthy' | 'warning' | 'critical' | 'predicted-failure';

interface SatTelemetry {
  status: HealthState;
  battery: number;        // %
  voltage: number;        // V
  tempInternal: number;   // °C
  tempExternal: number;   // °C
  altitude: number;       // km
  velocity: number;       // km/s
  signal: number;         // dBm
  aiRiskScore: number;    // 0-100
  rulDays: number;
  anomalies: { sensor: string; severity: HealthState; probability: number }[];
}

function computeTelemetry(pos: LiveSatellitePosition): SatTelemetry {
  const rng = seeded(pos.noradId);
  const aiRiskScore = Math.round(rng() * 100);
  let status: HealthState;
  if (aiRiskScore >= 85) status = 'predicted-failure';
  else if (aiRiskScore >= 65) status = 'critical';
  else if (aiRiskScore >= 40) status = 'warning';
  else status = 'healthy';

  const rulDays =
    status === 'predicted-failure' ? Math.round(5 + rng() * 25)
    : status === 'critical' ? Math.round(30 + rng() * 90)
    : status === 'warning' ? Math.round(180 + rng() * 365)
    : Math.round(700 + rng() * 1200);

  const battery = Math.round(
    status === 'predicted-failure' ? 18 + rng() * 15
    : status === 'critical' ? 35 + rng() * 20
    : status === 'warning' ? 55 + rng() * 20
    : 78 + rng() * 20
  );

  const sensorPool = ['Battery Cell', 'Reaction Wheel', 'Solar Panel', 'Thermal Loop', 'S-Band TX', 'Star Tracker', 'GPS Receiver'];
  const anomalyCount = status === 'healthy' ? 0 : status === 'warning' ? 1 : status === 'critical' ? 2 : 3;
  const anomalies = Array.from({ length: anomalyCount }, (_, i) => {
    const sev: HealthState = i === 0 && status === 'predicted-failure' ? 'predicted-failure'
      : i === 0 ? status
      : rng() > 0.5 ? 'warning' : 'critical';
    return {
      sensor: sensorPool[Math.floor(rng() * sensorPool.length)],
      severity: sev,
      probability: Math.round(50 + rng() * 50),
    };
  });

  return {
    status,
    battery,
    voltage: parseFloat((24 + rng() * 6).toFixed(2)),
    tempInternal: parseFloat((10 + rng() * 25).toFixed(1)),
    tempExternal: parseFloat((-50 + rng() * 100).toFixed(1)),
    altitude: pos.altitude || Math.round(400 + rng() * 600),
    velocity: pos.velocity || parseFloat((7.4 + rng() * 0.5).toFixed(2)),
    signal: parseFloat((-90 + rng() * 35).toFixed(1)),
    aiRiskScore,
    rulDays,
    anomalies,
  };
}

const statusColors: Record<HealthState, string> = {
  healthy: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  'predicted-failure': '#3b82f6',
};

const statusLabels: Record<HealthState, string> = {
  healthy: 'NOMINAL',
  warning: 'DEGRADED',
  critical: 'CRITICAL',
  'predicted-failure': 'FAILURE PREDICTED',
};

/* ───────────────────────── 3D scene parts ───────────────────────── */

// Subsolar longitude (very approx) — gives a believable day/night terminator.
function subsolarLng(): number {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  return 180 - utcHours * 15;
}
function subsolarLat(): number {
  // Seasonal declination approximation
  const d = (Date.UTC(new Date().getUTCFullYear(), 0, 0));
  const day = (Date.now() - d) / 86400000;
  return 23.44 * Math.sin(((360 / 365) * (day - 81)) * Math.PI / 180);
}

function Earth() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture(earthTexture);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.035;
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 128, 128]}>
        <meshPhongMaterial
          map={texture}
          specular={new THREE.Color('#2a5a8a')}
          shininess={22}
          emissive={new THREE.Color('#ffffff')}
          emissiveMap={texture}
          emissiveIntensity={0.55}
        />
      </Sphere>
      <Sphere args={[2.085, 64, 64]}>
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[2.16, 64, 64]}>
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.06} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

function Sunlight() {
  // Position the Sun based on subsolar point so the day side lines up roughly with reality.
  const [x, y, z] = useMemo(() => latLngToVec3(subsolarLat(), subsolarLng(), 12), []);
  return (
    <>
      <directionalLight position={[x, y, z]} intensity={2.0} color="#fff4d6" castShadow={false} />
      <ambientLight intensity={0.65} color="#b8c8e0" />
      <pointLight position={[x * 1.4, y * 1.4, z * 1.4]} intensity={1.0} color="#ffd27a" distance={40} />
    </>
  );
}

function OrbitTrail({ noradId, color }: { noradId: number; color: string }) {
  const { data: trail } = useOrbitTrail(noradId);
  const lineObj = useMemo(() => {
    if (!trail || trail.length < 2) return null;
    const points = trail.map(p => {
      const [x, y, z] = latLngToVec3(p.lat, p.lng, 2.32);
      return new THREE.Vector3(x, y, z);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
    return new THREE.Line(geo, mat);
  }, [trail, color]);
  if (!lineObj) return null;
  return <primitive object={lineObj} />;
}

function SatelliteMarker({
  pos, telemetry, onSelect, isSelected,
}: {
  pos: LiveSatellitePosition;
  telemetry: SatTelemetry;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(() => latLngToVec3(pos.lat, pos.lng, 2.32), [pos.lat, pos.lng]);
  const color = statusColors[telemetry.status];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 1.6;
      meshRef.current.rotation.x = t * 0.9;
    }
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.4;
      ringRef.current.scale.setScalar(pulse);
      const m = ringRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 - Math.sin(t * 3) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'default'; setHovered(false); }}
      >
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* soft outer glow */}
      <mesh>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* inner bright core */}
      <mesh>
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.18, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.25, 64]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}

      {hovered && (
        <Html distanceFactor={6} style={{ pointerEvents: 'none' }} position={[0, 0.28, 0]} center>
          <div className="bg-card/95 border rounded-md px-2.5 py-1.5 whitespace-nowrap backdrop-blur-md shadow-xl animate-fade-in"
               style={{ borderColor: color, boxShadow: `0 0 12px ${color}55` }}>
            <div className="font-display text-[11px] text-foreground leading-tight">{pos.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-[9px] font-display uppercase tracking-wider" style={{ color }}>{statusLabels[telemetry.status]}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1.5 text-[9px] font-mono">
              <div><div className="text-muted-foreground">HEALTH</div><div className="text-foreground">{100 - telemetry.aiRiskScore}</div></div>
              <div><div className="text-muted-foreground">RISK</div><div style={{ color }}>{telemetry.aiRiskScore}</div></div>
              <div><div className="text-muted-foreground">ALT</div><div className="text-foreground">{Math.round(telemetry.altitude)}km</div></div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* AI risk heatmap — dim color-coded halos on the Earth surface beneath each sat */
function RiskHeatmap({ entries }: { entries: { lat: number; lng: number; color: string; intensity: number }[] }) {
  return (
    <group>
      {entries.map((e, i) => {
        const [x, y, z] = latLngToVec3(e.lat, e.lng, 2.012);
        const normal = new THREE.Vector3(x, y, z).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        return (
          <mesh key={i} position={[x, y, z]} quaternion={quat}>
            <circleGeometry args={[0.18 + e.intensity * 0.2, 24]} />
            <meshBasicMaterial
              color={e.color}
              transparent
              opacity={0.12 + e.intensity * 0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* Debris belt — deterministic scatter ring around Earth */
function DebrisField() {
  const points = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    let s = 12345;
    const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 220; i++) {
      const lat = (r() - 0.5) * 160;
      const lng = r() * 360 - 180;
      const radius = 2.45 + r() * 0.55;
      const [x, y, z] = latLngToVec3(lat, lng, radius);
      arr.push(new THREE.Vector3(x, y, z));
    }
    return arr;
  }, []);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const groupRef = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });
  return (
    <points ref={groupRef} geometry={geom}>
      <pointsMaterial color="#94a3b8" size={0.025} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function SceneContent({
  selectedId, setSelectedId, showTrails, showHeatmap, showDebris,
}: {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  showTrails: boolean;
  showHeatmap: boolean;
  showDebris: boolean;
}) {
  const { data: livePositions } = useLiveSatellites();

  const enriched = useMemo(() => {
    return (livePositions || []).map(pos => {
      const telemetry = computeTelemetry(pos);
      return { pos, telemetry, id: `norad-${pos.noradId}` };
    });
  }, [livePositions]);

  const trailTargets = useMemo(() => enriched.slice(0, 6), [enriched]);
  const heatmapEntries = useMemo(
    () => enriched.map(e => ({
      lat: e.pos.lat,
      lng: e.pos.lng,
      color: statusColors[e.telemetry.status],
      intensity: e.telemetry.aiRiskScore / 100,
    })),
    [enriched],
  );

  return (
    <>
      <Sunlight />
      <Stars radius={50} depth={30} count={3500} factor={3} saturation={0} fade speed={0.4} />
      <Earth />
      {showHeatmap && <RiskHeatmap entries={heatmapEntries} />}
      {showDebris && <DebrisField />}
      {showTrails && trailTargets.map(e => (
        <OrbitTrail
          key={`trail-${e.pos.noradId}`}
          noradId={e.pos.noradId}
          color={statusColors[e.telemetry.status]}
        />
      ))}
      {enriched.map(e => (
        <SatelliteMarker
          key={e.id}
          pos={e.pos}
          telemetry={e.telemetry}
          onSelect={() => setSelectedId(e.id)}
          isSelected={selectedId === e.id}
        />
      ))}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.2} minDistance={3.2} maxDistance={8} />
    </>
  );
}

/* ───────────────────────── Overlay panels (HTML/2D) ───────────────────────── */

function HealthBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function TelemetryPanel({
  entry, onClose,
}: {
  entry: { pos: LiveSatellitePosition; telemetry: SatTelemetry; id: string };
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { pos, telemetry, id } = entry;
  const c = statusColors[telemetry.status];

  return (
    <div className="absolute top-2 right-2 bottom-2 w-[290px] bg-card/95 border border-border rounded-lg backdrop-blur-md shadow-2xl shadow-primary/10 overflow-hidden flex flex-col animate-fade-in">
      <div className="flex items-start justify-between p-3 border-b border-border/60" style={{ background: `linear-gradient(90deg, ${c}22, transparent)` }}>
        <div>
          <div className="text-[9px] font-display tracking-widest text-muted-foreground">TELEMETRY · LIVE</div>
          <div className="font-display text-sm text-foreground mt-0.5 leading-tight">{pos.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: c }} />
            <span className="text-[9px] font-display tracking-wider" style={{ color: c }}>{statusLabels[telemetry.status]}</span>
            <span className="text-[9px] font-display text-muted-foreground">· NORAD {pos.noradId}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {/* AI Risk */}
        <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-display tracking-wider text-muted-foreground">AI RISK SCORE</span>
            </div>
            <span className="font-display text-lg leading-none" style={{ color: c }}>{telemetry.aiRiskScore}</span>
          </div>
          <HealthBar value={telemetry.aiRiskScore} color={c} />
          <div className="text-[9px] text-muted-foreground mt-1.5 font-mono">
            RUL ≈ {telemetry.rulDays}d · confidence {Math.min(95, 60 + telemetry.aiRiskScore / 4).toFixed(0)}%
          </div>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricTile icon={<Battery className="w-3 h-3" />} label="BATTERY" value={`${telemetry.battery}%`} sub={`${telemetry.voltage} V`} color={telemetry.battery < 30 ? '#ef4444' : telemetry.battery < 60 ? '#eab308' : '#22c55e'} />
          <MetricTile icon={<Thermometer className="w-3 h-3" />} label="TEMP INT" value={`${telemetry.tempInternal}°C`} sub={`ext ${telemetry.tempExternal}°C`} color="#06b6d4" />
          <MetricTile icon={<Mountain className="w-3 h-3" />} label="ALTITUDE" value={`${Math.round(telemetry.altitude)} km`} sub={`${telemetry.velocity} km/s`} color="#a855f7" />
          <MetricTile icon={<Radio className="w-3 h-3" />} label="SIGNAL" value={`${telemetry.signal} dBm`} sub={pos.category?.toUpperCase() || 'SAT'} color="#0ea5e9" />
        </div>

        {/* Anomaly predictions */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-display tracking-wider text-muted-foreground">ANOMALY PREDICTIONS</span>
          </div>
          {telemetry.anomalies.length === 0 ? (
            <div className="text-[10px] text-muted-foreground font-mono italic p-2 rounded border border-border/40 bg-muted/10">
              No anomalies forecast. All subsystems nominal.
            </div>
          ) : (
            <div className="space-y-1">
              {telemetry.anomalies.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded border border-border/40 bg-muted/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[a.severity] }} />
                    <span className="text-[10px] font-mono text-foreground truncate">{a.sensor}</span>
                  </div>
                  <span className="text-[10px] font-display tracking-wider" style={{ color: statusColors[a.severity] }}>{a.probability}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-[10px] font-display tracking-wider"
          onClick={() => navigate(`/satellite/${id}`)}
        >
          OPEN FULL TELEMETRY <ExternalLink className="w-3 h-3 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function MetricTile({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground" style={{ color }}>
        {icon}
        <span className="text-[9px] font-display tracking-wider">{label}</span>
      </div>
      <div className="font-display text-sm text-foreground mt-1 leading-none">{value}</div>
      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

/* ───────────────────────── Top-level component ───────────────────────── */

const LegendPill = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
    <span className="text-[8px] font-display tracking-wider text-muted-foreground">{label}</span>
  </div>
);

const GlobeVisualization = () => {
  const { data: livePositions } = useLiveSatellites();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTrails, setShowTrails] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDebris, setShowDebris] = useState(true);
  const [solarFlux, setSolarFlux] = useState(118); // Kp/F10.7 simulated

  useEffect(() => {
    const t = setInterval(() => {
      setSolarFlux(prev => {
        const drift = (Math.random() - 0.5) * 4;
        return Math.max(70, Math.min(220, prev + drift));
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const enriched = useMemo(() => (livePositions || []).map(pos => ({
    pos, telemetry: computeTelemetry(pos), id: `norad-${pos.noradId}`,
  })), [livePositions]);

  const selectedEntry = useMemo(
    () => enriched.find(e => e.id === selectedId) || null,
    [enriched, selectedId],
  );

  const fleet = useMemo(() => {
    const counts: Record<HealthState, number> = { healthy: 0, warning: 0, critical: 0, 'predicted-failure': 0 };
    let totalRisk = 0;
    enriched.forEach(e => { counts[e.telemetry.status]++; totalRisk += e.telemetry.aiRiskScore; });
    const total = enriched.length;
    const avgRisk = total ? Math.round(totalRisk / total) : 0;
    const fleetHealth = total ? Math.round(((counts.healthy + counts.warning * 0.6) / total) * 100) : 0;
    return { counts, total, avgRisk, fleetHealth };
  }, [enriched]);

  const solarLabel = solarFlux > 180 ? 'STORM' : solarFlux > 140 ? 'ELEVATED' : solarFlux > 100 ? 'ACTIVE' : 'QUIET';
  const solarColor = solarFlux > 180 ? '#ef4444' : solarFlux > 140 ? '#f59e0b' : solarFlux > 100 ? '#eab308' : '#22c55e';

  return (
    <div className="w-full h-full relative bg-[#020617]">
      <Canvas camera={{ position: [0, 1.4, 5.5], fov: 45 }} gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 12, 26]} />
        <SceneContent
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          showTrails={showTrails}
          showHeatmap={showHeatmap}
          showDebris={showDebris}
        />
      </Canvas>

      {/* Top-left: mission control header */}
      <div className="absolute top-2 left-2 bg-card/85 backdrop-blur-md border border-border rounded-lg px-3 py-2 min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-display text-[10px] tracking-[0.2em] text-primary">DIGITAL TWIN · LIVE</span>
        </div>
        <div className="text-[8px] font-mono text-muted-foreground mt-1">
          {fleet.total} TRACKED · {new Date().toUTCString().slice(17, 25)} UTC
        </div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2">
          <LegendPill color={statusColors.healthy} label={`NOMINAL ${fleet.counts.healthy}`} />
          <LegendPill color={statusColors.warning} label={`DEGRADED ${fleet.counts.warning}`} />
          <LegendPill color={statusColors.critical} label={`CRITICAL ${fleet.counts.critical}`} />
          <LegendPill color={statusColors['predicted-failure']} label={`PREDICTED ${fleet.counts['predicted-failure']}`} />
        </div>
      </div>

      {/* Top-right: solar activity (hidden when telemetry panel open) */}
      {!selectedEntry && (
        <div className="absolute top-2 right-2 bg-card/85 backdrop-blur-md border border-border rounded-lg px-3 py-2 w-[180px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3 h-3" style={{ color: solarColor }} />
              <span className="text-[9px] font-display tracking-widest text-muted-foreground">SOLAR ACTIVITY</span>
            </div>
            <span className="text-[9px] font-display tracking-wider" style={{ color: solarColor }}>{solarLabel}</span>
          </div>
          <div className="mt-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-lg leading-none" style={{ color: solarColor }}>{Math.round(solarFlux)}</span>
              <span className="text-[9px] font-mono text-muted-foreground">F10.7 sfu</span>
            </div>
            <div className="h-1 mt-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(solarFlux / 220) * 100}%`, background: `linear-gradient(90deg, #22c55e, #eab308, #ef4444)` }} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom-left: fleet analytics */}
      <div className="absolute bottom-2 left-2 bg-card/85 backdrop-blur-md border border-border rounded-lg px-3 py-2 w-[230px]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-display tracking-widest text-muted-foreground">FLEET ANALYTICS</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <div className="text-[8px] font-mono text-muted-foreground">FLEET HEALTH</div>
            <div className="font-display text-base leading-none text-foreground mt-0.5">{fleet.fleetHealth}<span className="text-[9px] text-muted-foreground">%</span></div>
            <HealthBar value={fleet.fleetHealth} color={fleet.fleetHealth > 70 ? '#22c55e' : fleet.fleetHealth > 40 ? '#eab308' : '#ef4444'} />
          </div>
          <div>
            <div className="text-[8px] font-mono text-muted-foreground">AVG AI RISK</div>
            <div className="font-display text-base leading-none text-foreground mt-0.5">{fleet.avgRisk}<span className="text-[9px] text-muted-foreground">/100</span></div>
            <HealthBar value={fleet.avgRisk} color={fleet.avgRisk > 65 ? '#ef4444' : fleet.avgRisk > 40 ? '#eab308' : '#22c55e'} />
          </div>
        </div>
        <div className="flex h-1.5 mt-2 rounded-full overflow-hidden bg-muted/30">
          {(['healthy', 'warning', 'critical', 'predicted-failure'] as HealthState[]).map(s => {
            const pct = fleet.total ? (fleet.counts[s] / fleet.total) * 100 : 0;
            return <div key={s} style={{ width: `${pct}%`, backgroundColor: statusColors[s] }} />;
          })}
        </div>
      </div>

      {/* Bottom-right: layer toggles */}
      <div className="absolute bottom-2 right-2 bg-card/85 backdrop-blur-md border border-border rounded-lg p-1.5 flex flex-col gap-1">
        <ToggleChip active={showTrails} onClick={() => setShowTrails(v => !v)} icon={<Orbit className="w-3 h-3" />} label="ORBITS" />
        <ToggleChip active={showHeatmap} onClick={() => setShowHeatmap(v => !v)} icon={<Layers className="w-3 h-3" />} label="AI RISK" />
        <ToggleChip active={showDebris} onClick={() => setShowDebris(v => !v)} icon={<span className="w-3 h-3 inline-block text-center text-[10px] leading-3">·:·</span>} label="DEBRIS" />
      </div>

      {/* Telemetry panel */}
      {selectedEntry && (
        <TelemetryPanel entry={selectedEntry} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

function ToggleChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-display tracking-wider transition-colors ${
        active
          ? 'bg-primary/15 border-primary/50 text-primary'
          : 'bg-transparent border-border/60 text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default GlobeVisualization;
