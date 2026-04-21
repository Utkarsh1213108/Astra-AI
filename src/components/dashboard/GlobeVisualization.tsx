import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useLiveSatellites, useOrbitTrail } from '@/hooks/useLiveSatellites';

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

function Globe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  const gridLines = useMemo(() => {
    const geometries: { points: THREE.Vector3[] }[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (90 - lat) * (Math.PI / 180);
      const radius = 2.02 * Math.sin(phi);
      const y = 2.02 * Math.cos(phi);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta)));
      }
      geometries.push({ points: pts });
    }
    for (let lng = 0; lng < 360; lng += 45) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI;
        const theta = lng * (Math.PI / 180);
        pts.push(new THREE.Vector3(
          2.02 * Math.sin(phi) * Math.cos(theta),
          2.02 * Math.cos(phi),
          2.02 * Math.sin(phi) * Math.sin(theta),
        ));
      }
      geometries.push({ points: pts });
    }
    return geometries;
  }, []);

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#0c1425"
          emissive="#0ea5e9"
          emissiveIntensity={0.03}
          transparent
          opacity={0.9}
        />
      </Sphere>
      <Sphere args={[2.01, 64, 64]}>
        <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.06} />
      </Sphere>
      {gridLines.map((g, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(g.points);
        return (
          <primitive key={i} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#0ea5e9', opacity: 0.12, transparent: true }))} />
        );
      })}
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
      opacity: 0.4,
      transparent: true,
    });
    return new THREE.Line(geometry, material);
  }, [trail, color]);

  if (!lineObj) return null;
  return <primitive object={lineObj} />;
}

function SatelliteMarker({ lat, lng, name, id, color, category }: {
  lat: number; lng: number; name: string; id: string; color: string; category?: string;
}) {
  const navigate = useNavigate();
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo((): [number, number, number] => {
    return latLngToVec3(lat, lng, 2.3);
  }, [lat, lng]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const categoryLabel = category ? category.toUpperCase() : 'SAT';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => navigate(`/satellite/${id}`)}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = 'default'; setHovered(false); }}
      >
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={0.5} />
      <Html distanceFactor={10} style={{ pointerEvents: 'none' }} position={[0, 0.12, 0]} center>
        <div className={`border rounded px-1.5 py-0.5 whitespace-nowrap backdrop-blur-sm transition-all ${hovered ? 'bg-card/95 border-primary/50 scale-110' : 'bg-card/70 border-border/60'}`}>
          <span className="font-display text-[9px] text-foreground">{name}</span>
          {hovered && (
            <span className="ml-1 text-[8px]" style={{ color }}>● {categoryLabel}</span>
          )}
        </div>
      </Html>
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
    }));
  }, [livePositions]);

  // Show orbit trails for first few satellites to avoid too many API calls
  const trailSatellites = useMemo(() => markers.slice(0, 4), [markers]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#0ea5e9" />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6366f1" />
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
        />
      ))}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.3} minDistance={3.5} maxDistance={8} />
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
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} gl={{ antialias: true }}>
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
