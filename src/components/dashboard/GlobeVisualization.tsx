import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { satellites } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (90 - lat) * (Math.PI / 180);
      const radius = 2.02 * Math.sin(phi);
      const y = 2.02 * Math.cos(phi);
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta)));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lines.push(
        <lineLoop key={`lat-${lat}`} geometry={geometry}>
          <lineBasicMaterial color="#0ea5e9" opacity={0.15} transparent />
        </lineLoop>
      );
    }
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 45) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI;
        const theta = lng * (Math.PI / 180);
        points.push(new THREE.Vector3(
          2.02 * Math.sin(phi) * Math.cos(theta),
          2.02 * Math.cos(phi),
          2.02 * Math.sin(phi) * Math.sin(theta),
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lines.push(
        <line key={`lng-${lng}`} geometry={geometry}>
          <lineBasicMaterial color="#0ea5e9" opacity={0.12} transparent />
        </line>
      );
    }
    return lines;
  }, []);

  return (
    <group ref={meshRef}>
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#0c1425"
          emissive="#0ea5e9"
          emissiveIntensity={0.03}
          wireframe={false}
          transparent
          opacity={0.9}
        />
      </Sphere>
      <Sphere args={[2.01, 64, 64]}>
        <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.06} />
      </Sphere>
      {gridLines}
    </group>
  );
}

function SatelliteMarker({ lat, lng, status, name, id }: {
  lat: number; lng: number; status: string; name: string; id: string;
}) {
  const navigate = useNavigate();
  const meshRef = useRef<THREE.Mesh>(null);

  const position = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const r = 2.3;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    );
  }, [lat, lng]);

  const color = status === 'critical' ? '#ef4444' : status === 'warning' ? '#eab308' : '#22c55e';

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = status === 'critical' ? 1 + Math.sin(clock.getElapsedTime() * 4) * 0.3 : 1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={() => navigate(`/satellite/${id}`)} onPointerOver={(e) => { (e.object as THREE.Mesh).scale.setScalar(1.5); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { (e.object as THREE.Mesh).scale.setScalar(1); document.body.style.cursor = 'default'; }}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={0.5} />
      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="bg-card/90 border border-border rounded px-2 py-1 whitespace-nowrap backdrop-blur-sm">
          <span className="font-display text-[8px] text-foreground">{name}</span>
        </div>
      </Html>
    </group>
  );
}

const GlobeVisualization = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} color="#0ea5e9" />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6366f1" />
        <Globe />
        {satellites.map(sat => (
          <SatelliteMarker
            key={sat.id}
            lat={sat.lat}
            lng={sat.lng}
            status={sat.status}
            name={sat.name}
            id={sat.id}
          />
        ))}
        <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.3} minDistance={3.5} maxDistance={8} />
      </Canvas>
      <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <span className="font-display text-[10px] tracking-wider text-primary">ORBITAL MAP — LIVE</span>
      </div>
    </div>
  );
};

export default GlobeVisualization;
