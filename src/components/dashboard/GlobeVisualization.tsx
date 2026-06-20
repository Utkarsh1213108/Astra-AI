import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, useTexture, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useLiveSatellites, useOrbitTrail } from '@/hooks/useLiveSatellites';
import earthTexture from '@/assets/earth-texture.jpg';

extend({ Line_: THREE.Line });

function latLngToVec3(lat: number, lng: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

const categoryColors: Record<string, string> = {
  station: '#f59e0b',
  science: '#8b5cf6',
  cubesat: '#22c55e',
  starlink: '#06b6d4',
  weather: '#ec4899',
};

// Deterministic per-satellite status (matches generatedData seeded RNG)
function statusForNorad(noradId: number): 'healthy' | 'warning' | 'critical' {
  let s = noradId || 1;
  // advance a few steps to mimic subsystem generation
  for (let i = 0; i < 4; i++) s = (s * 16807) % 2147483647;
  const r = (s - 1) / 2147483646;
  const score = 60 + r * 40;
  if (score >= 80) return 'healthy';
  if (score >= 70) return 'warning';
  return 'critical';
}

const statusColor: Record<string, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

function Globe() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture(earthTexture);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Earth surface */}
      <Sphere args={[2, 96, 96]}>
        <meshPhongMaterial
          map={texture}
          specular={new THREE.Color('#1a3a5a')}
          shininess={12}
          emissive={new THREE.Color('#0a1428')}
          emissiveIntensity={0.18}
        />
      </Sphere>
      {/* Atmospheric glow */}
      <Sphere args={[2.08, 64, 64]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
      <Sphere args={[2.14, 64, 64]}>
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

function OrbitTrail({ noradId, color }: { noradId: number; color: string }) {
  const { data: trail } = useOrbitTrail(noradId);

  const lineObj = useMemo(() => {
    if (!trail || trail.length < 2) return null;
    const points = trail.map(p => {
      const [x, y, z] = latLngToVec3(p.lat, p.lng, 2.3);
      return new THREE.Vector3(x, y, z);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      opacity: 0.55,
      transparent: true,
    });
    return new THREE.Line(geometry, material);
  }, [trail, color]);

  if (!lineObj) return null;
  return <primitive object={lineObj} />;
}

function SatelliteMarker({ lat, lng, name, id, color, category, status }: {
  lat: number; lng: number; name: string; id: string; color: string; category?: string; status: 'healthy' | 'warning' | 'critical';
}) {
  const navigate = useNavigate();
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo((): [number, number, number] => {
    return latLngToVec3(lat, lng, 2.3);
  }, [lat, lng]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 1.5;
      meshRef.current.rotation.x = t * 0.8;
    }
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.35;
      ringRef.current.scale.setScalar(pulse);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 - Math.sin(t * 3) * 0.3;
    }
  });

  const categoryLabel = category ? category.toUpperCase() : 'SAT';
  const anomalyColor = statusColor[status];
  const showAnomaly = status !== 'healthy';

  return (
    <group position={position}>
      {/* Hover hit-area (larger, invisible) */}
      <mesh
        onClick={() => navigate(`/satellite/${id}`)}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'default'; setHovered(false); }}
      >
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Marker dot */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>

      {/* Anomaly pulse ring */}
      {showAnomaly && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.085, 32]} />
          <meshBasicMaterial color={anomalyColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Hover label */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }} position={[0, 0.14, 0]} center>
          <div className="bg-card/95 border border-primary/60 rounded px-2 py-1 whitespace-nowrap backdrop-blur-md shadow-lg shadow-primary/20 animate-fade-in">
            <div className="font-display text-[10px] text-foreground leading-tight">{name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: anomalyColor }} />
              <span className="text-[8px] font-display" style={{ color }}>{categoryLabel}</span>
              <span className="text-[8px] font-display uppercase text-muted-foreground">· {status}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function SceneContent() {
  const { data: livePositions } = useLiveSatellites();

  const markers = useMemo(() => {
    return (livePositions || []).map((pos) => ({
      lat: pos.lat,
      lng: pos.lng,
      name: pos.name,
      id: `norad-${pos.noradId}`,
      noradId: pos.noradId,
      color: categoryColors[pos.category || 'cubesat'] || '#22c55e',
      category: pos.category,
      status: statusForNorad(pos.noradId),
    }));
  }, [livePositions]);

  // Show orbit trails for first few satellites to avoid too many API calls
  const trailSatellites = useMemo(() => markers.slice(0, 6), [markers]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-5, -2, -5]} intensity={0.25} color="#6366f1" />
      <Stars radius={50} depth={30} count={3000} factor={3} saturation={0} fade speed={0.5} />
      <Globe />
      {trailSatellites.map((m) => (
        <OrbitTrail
          key={`trail-${m.noradId}`}
          noradId={m.noradId}
          color={m.color}
        />
      ))}
      {markers.map((m, i) => (
        <SatelliteMarker
          key={`${m.id}-${i}`}
          lat={m.lat}
          lng={m.lng}
          name={m.name}
          id={m.id}
          color={m.color}
          category={m.category}
          status={m.status}
        />
      ))}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.25} minDistance={3.2} maxDistance={8} />
    </>
  );
}

const GlobeVisualization = () => {
  const { data: livePositions } = useLiveSatellites();
  const liveCount = livePositions?.length || 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (livePositions || []).forEach(p => {
      const cat = p.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [livePositions]);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 1.5, 5.5], fov: 45 }} gl={{ antialias: true }}>
        <SceneContent />
      </Canvas>
      <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <span className="font-display text-[10px] tracking-wider text-primary">ORBITAL MAP — LIVE</span>
        {liveCount > 0 && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <span key={cat} className="text-[8px] font-display" style={{ color: categoryColors[cat] || '#22c55e' }}>
                {count} {cat.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="absolute bottom-2 right-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 flex flex-col gap-0.5">
        {Object.entries(categoryColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[7px] font-display text-muted-foreground">{cat.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobeVisualization;
