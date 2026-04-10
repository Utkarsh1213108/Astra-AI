import { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useLiveSatellites } from '@/hooks/useLiveSatellites';

extend({ Line_: THREE.Line });

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

function SatelliteMarker({ lat, lng, name, id }: {
  lat: number; lng: number; name: string; id: string;
}) {
  const navigate = useNavigate();
  const meshRef = useRef<THREE.Mesh>(null);

  const position = useMemo((): [number, number, number] => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const r = 2.3;
    return [
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ];
  }, [lat, lng]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => navigate(`/satellite/${id}`)}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
      <pointLight color="#22c55e" intensity={0.5} distance={0.5} />
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="bg-card/90 border border-border rounded px-2 py-1 whitespace-nowrap backdrop-blur-sm">
          <span className="font-display text-[8px] text-foreground">{name}</span>
          <span className="ml-1 text-[7px] text-success">● LIVE</span>
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
    }));
  }, [livePositions]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#0ea5e9" />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6366f1" />
      <Globe />
      {markers.map((m, i) => (
        <SatelliteMarker
          key={`${m.id}-${i}`}
          lat={m.lat}
          lng={m.lng}
          name={m.name}
          id={m.id}
        />
      ))}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.3} minDistance={3.5} maxDistance={8} />
    </>
  );
}

const GlobeVisualization = () => {
  const { data: livePositions } = useLiveSatellites();
  const liveCount = livePositions?.length || 0;

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} gl={{ antialias: true }}>
        <SceneContent />
      </Canvas>
      <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <span className="font-display text-[10px] tracking-wider text-primary">ORBITAL MAP — LIVE</span>
        {liveCount > 0 && (
          <span className="ml-2 text-[9px] text-success font-display">
            {liveCount} LIVE TRACKED
          </span>
        )}
      </div>
    </div>
  );
};

export default GlobeVisualization;
