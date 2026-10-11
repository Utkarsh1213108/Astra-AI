import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useLiveSatellites, useOrbitTrail } from '@/hooks/useLiveSatellites';

interface SatellitePoint {
  noradId: number;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  velocity: number | null;
  category?: string;
}

const EARTH_RADIUS = 2;
const ORBIT_BASE_RADIUS = 2.28;

const categoryColors: Record<string, string> = {
  station: '#f59e0b',
  science: '#8b5cf6',
  cubesat: '#22c55e',
  starlink: '#06b6d4',
  weather: '#ec4899',
};

function latLngToVector(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* =========================================================
   REALISTIC MINI SATELLITE
   ========================================================= */

function MiniSatellite({
  color,
  hovered,
}: {
  color: string;
  hovered: boolean;
}) {
  const satelliteRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!satelliteRef.current) return;

    /*
     * Very subtle spacecraft attitude motion.
     * This is NOT orbital movement.
     * Orbital movement comes from the real satellite position.
     */
    satelliteRef.current.rotation.z =
      Math.sin(clock.getElapsedTime() * 0.8) * 0.08;
  });

  return (
    <group
      ref={satelliteRef}
      scale={hovered ? 1.18 : 1}
    >
      {/* Main spacecraft body */}
      <mesh>
        <boxGeometry args={[0.10, 0.065, 0.065]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.85}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Front instrument section */}
      <mesh position={[0.058, 0, 0]}>
        <boxGeometry args={[0.018, 0.045, 0.045]} />
        <meshStandardMaterial
          color="#64748b"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>

      {/* Left solar panel */}
      <group position={[-0.075, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.07, 0.055, 0.008]} />
          <meshStandardMaterial
            color="#164e63"
            metalness={0.65}
            roughness={0.3}
            emissive="#0284c7"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Solar panel grid */}
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[0.06, 0.045]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>

      {/* Right solar panel */}
      <group position={[0.075, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.07, 0.055, 0.008]} />
          <meshStandardMaterial
            color="#164e63"
            metalness={0.65}
            roughness={0.3}
            emissive="#0284c7"
            emissiveIntensity={0.15}
          />
        </mesh>

        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[0.06, 0.045]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>

      {/* Small antenna */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.05, 8]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Tiny category/status light */}
      <mesh position={[0.065, 0.02, 0.035]}>
        <sphereGeometry args={[0.009, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Very subtle glow */}
      <pointLight
        color={color}
        intensity={hovered ? 0.45 : 0.15}
        distance={0.35}
      />
    </group>
  );
}

/* =========================================================
   SMOOTH LIVE SATELLITE
   ========================================================= */

function SatelliteMarker({
  satellite,
}: {
  satellite: SatellitePoint;
}) {
  const navigate = useNavigate();

  const groupRef = useRef<THREE.Group>(null);

  const [hovered, setHovered] = useState(false);

  const targetPosition = useRef(
    latLngToVector(
      satellite.lat,
      satellite.lng,
      ORBIT_BASE_RADIUS
    )
  );

  const currentPosition = useRef(
    targetPosition.current.clone()
  );

  const previousUpdate = useRef(Date.now());

  /*
   * When the API gives us a new position,
   * update the target rather than instantly moving.
   */
  useMemo(() => {
    const altitudeOffset =
      satellite.altitude != null
        ? Math.min(Math.max(satellite.altitude / 10000, 0), 0.35)
        : 0.12;

    const radius =
      ORBIT_BASE_RADIUS + altitudeOffset;

    targetPosition.current = latLngToVector(
      satellite.lat,
      satellite.lng,
      radius
    );

    previousUpdate.current = Date.now();

    return null;
  }, [
    satellite.lat,
    satellite.lng,
    satellite.altitude,
  ]);

  useFrame(() => {
    if (!groupRef.current) return;

    /*
     * Smooth interpolation between real API positions.
     * No random movement is generated.
     */
    currentPosition.current.lerp(
      targetPosition.current,
      0.025
    );

    groupRef.current.position.copy(
      currentPosition.current
    );

    /*
     * Keep the tiny spacecraft facing along its
     * direction of travel.
     */
    const direction =
      targetPosition.current
        .clone()
        .sub(currentPosition.current);

    if (direction.lengthSq() > 0.000001) {
      const lookTarget =
        currentPosition.current.clone().add(direction);

      groupRef.current.lookAt(lookTarget);
    }
  });

  const color =
    categoryColors[satellite.category || 'cubesat'] ||
    '#22c55e';

  return (
    <group ref={groupRef}>
      {/* Satellite itself */}
      <group
        onClick={(event) => {
          event.stopPropagation();

          navigate(
            `/satellite/norad-${satellite.noradId}`
          );
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          setHovered(false);
        }}
      >
        <MiniSatellite
          color={color}
          hovered={hovered}
        />
      </group>

      {/* Name appears ONLY when hovering */}
      {hovered && (
        <Html
          distanceFactor={8}
          position={[0, 0.14, 0]}
          center
          style={{
            pointerEvents: 'none',
          }}
        >
          <div className="px-2 py-1 rounded-md border border-primary/40 bg-card/95 backdrop-blur-sm whitespace-nowrap shadow-lg">
            <div className="text-[9px] font-display text-foreground">
              {satellite.name}
            </div>

            <div
              className="text-[7px] font-display mt-0.5"
              style={{ color }}
            >
              ● {(
                satellite.category || 'satellite'
              ).toUpperCase()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* =========================================================
   EARTH
   ========================================================= */

function Earth() {
  const earthRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!earthRef.current) return;

    /*
     * Continuous Earth rotation.
     */
    earthRef.current.rotation.y += delta * 0.045;
  });

  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];

    // Latitude
    for (let lat = -60; lat <= 60; lat += 30) {
      const points: THREE.Vector3[] = [];

      const phi =
        (90 - lat) * (Math.PI / 180);

      const radius =
        EARTH_RADIUS * Math.sin(phi);

      const y =
        EARTH_RADIUS * Math.cos(phi);

      for (let i = 0; i <= 72; i++) {
        const theta =
          (i / 72) * Math.PI * 2;

        points.push(
          new THREE.Vector3(
            radius * Math.cos(theta),
            y,
            radius * Math.sin(theta)
          )
        );
      }

      lines.push(points);
    }

    // Longitude
    for (let lng = 0; lng < 360; lng += 30) {
      const points: THREE.Vector3[] = [];

      const theta =
        lng * (Math.PI / 180);

      for (let i = 0; i <= 72; i++) {
        const phi =
          (i / 72) * Math.PI;

        points.push(
          new THREE.Vector3(
            EARTH_RADIUS *
              Math.sin(phi) *
              Math.cos(theta),
            EARTH_RADIUS *
              Math.cos(phi),
            EARTH_RADIUS *
              Math.sin(phi) *
              Math.sin(theta)
          )
        );
      }

      lines.push(points);
    }

    return lines;
  }, []);

  return (
    <group ref={earthRef}>
      {/* Main Earth */}
      <Sphere
        args={[
          EARTH_RADIUS,
          64,
          64,
        ]}
      >
        <meshStandardMaterial
          color="#07182c"
          emissive="#0369a1"
          emissiveIntensity={0.07}
          roughness={0.9}
          metalness={0.05}
          transparent
          opacity={0.96}
        />
      </Sphere>

      {/* Wireframe atmosphere */}
      <Sphere
        args={[
          EARTH_RADIUS + 0.015,
          64,
          64,
        ]}
      >
        <meshBasicMaterial
          color="#0ea5e9"
          wireframe
          transparent
          opacity={0.09}
        />
      </Sphere>

      {/* Geographic grid */}
      {gridLines.map((points, index) => {
        const geometry =
          new THREE.BufferGeometry().setFromPoints(
            points
          );

        const material =
          new THREE.LineBasicMaterial({
            color: '#0ea5e9',
            transparent: true,
            opacity: 0.11,
          });

        return (
          <primitive
            key={`grid-${index}`}
            object={
              new THREE.Line(
                geometry,
                material
              )
            }
          />
        );
      })}
    </group>
  );
}

/* =========================================================
   ORBIT TRAIL
   ========================================================= */

function OrbitTrail({
  noradId,
  color,
}: {
  noradId: number;
  color: string;
}) {
  const { data: trail } =
    useOrbitTrail(noradId);

  const line = useMemo(() => {
    if (!trail || trail.length < 2) {
      return null;
    }

    const points = trail.map((point) =>
      latLngToVector(
        point.lat,
        point.lng,
        ORBIT_BASE_RADIUS
      )
    );

    const geometry =
      new THREE.BufferGeometry().setFromPoints(
        points
      );

    const material =
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
      });

    return new THREE.Line(
      geometry,
      material
    );
  }, [trail, color]);

  if (!line) return null;

  return (
    <primitive object={line} />
  );
}

/* =========================================================
   SCENE
   ========================================================= */

function SceneContent() {
  const { data: livePositions } =
    useLiveSatellites();

  const satellites =
    useMemo<SatellitePoint[]>(() => {
      return livePositions || [];
    }, [livePositions]);

  /*
   * Only a few orbit trails to avoid unnecessary API calls.
   */
  const trailSatellites =
    useMemo(
      () => satellites.slice(0, 4),
      [satellites]
    );

  return (
    <>
      <ambientLight intensity={0.35} />

      <directionalLight
        position={[5, 4, 6]}
        intensity={1}
        color="#dbeafe"
      />

      <directionalLight
        position={[-4, -2, -4]}
        intensity={0.25}
        color="#38bdf8"
      />

      <pointLight
        position={[0, 0, 5]}
        intensity={0.35}
        color="#38bdf8"
      />

      <Earth />

      {trailSatellites.map(
        (satellite) => {
          const color =
            categoryColors[
              satellite.category ||
                'cubesat'
            ] || '#22c55e';

          return (
            <OrbitTrail
              key={`trail-${satellite.noradId}`}
              noradId={satellite.noradId}
              color={color}
            />
          );
        }
      )}

      {satellites.map(
        (satellite) => (
          <SatelliteMarker
            key={satellite.noradId}
            satellite={satellite}
          />
        )
      )}

      <OrbitControls
        enableZoom
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const GlobeVisualization = () => {
  const { data: livePositions } =
    useLiveSatellites();

  const liveCount =
    livePositions?.length || 0;

  const categoryCounts =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      (livePositions || []).forEach(
        (satellite) => {
          const category =
            satellite.category ||
            'other';

          counts[category] =
            (counts[category] || 0) + 1;
        }
      );

      return counts;
    }, [livePositions]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: [0, 1.5, 5.5],
          fov: 45,
        }}
        gl={{
          antialias: true,
        }}
        dpr={[1, 2]}
      >
        <SceneContent />
      </Canvas>

      {/* Header */}
      <div className="absolute top-2 left-2 bg-card/85 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
        <div className="font-display text-[10px] tracking-wider text-primary">
          ORBITAL MAP — LIVE
        </div>

        {liveCount > 0 && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {Object.entries(
              categoryCounts
            ).map(([category, count]) => (
              <span
                key={category}
                className="text-[8px] font-display"
                style={{
                  color:
                    categoryColors[
                      category
                    ] || '#22c55e',
                }}
              >
                {count}{' '}
                {category.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Live status */}
      <div className="absolute bottom-2 left-2 bg-card/85 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            liveCount > 0
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-muted-foreground'
          }`}
        />

        <span className="text-[7px] font-display text-muted-foreground">
          {liveCount > 0
            ? `${liveCount} SATELLITES TRACKED`
            : 'TRACKING OFFLINE'}
        </span>
      </div>

      {/* Category legend */}
      <div className="absolute bottom-2 right-2 bg-card/85 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 flex flex-col gap-0.5">
        {Object.entries(
          categoryColors
        ).map(([category, color]) => (
          <div
            key={category}
            className="flex items-center gap-1.5"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 5px ${color}`,
              }}
            />

            <span className="text-[7px] font-display text-muted-foreground">
              {category.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobeVisualization;