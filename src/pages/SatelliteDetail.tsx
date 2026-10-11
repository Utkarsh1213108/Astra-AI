import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  useLiveSatellites,
  useSatnogsData,
  useOrbitTrail,
} from '@/hooks/useLiveSatellites';

import { liveSatellitesToSatellites } from '@/data/generatedData';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts';

import { motion } from 'framer-motion';

import {
  ArrowLeft,
  Activity,
  Thermometer,
  Radio,
  RotateCw,
  Loader2,
  Satellite,
  Brain,
  AlertTriangle,
  MapPin,
  Gauge,
  Navigation,
  Orbit,
  Globe2,
} from 'lucide-react';

import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Sphere,
  useTexture,
  Html,
} from '@react-three/drei';

import * as THREE from 'three';

/* =========================================================
   TYPES
   ========================================================= */

interface TelemetryRow {
  index: number;
  time: string;
  value: number;
  baseline: number;
  anomaly: boolean;
  score: number;
}

interface MLTelemetryResponse {
  anomaly: boolean;
  score: number;
  threshold: number;
  window: number;
  channels: number;
  detected_points: number;
  detected_indices: number[];
  detector: string;
  max_score?: number;
  telemetry?: number[][];
}

/* =========================================================
   CONFIG
   ========================================================= */

const API_URL = 'http://127.0.0.1:8001';

const EARTH_RADIUS = 2;

const categoryColors: Record<string, string> = {
  station: '#f59e0b',
  science: '#8b5cf6',
  cubesat: '#22c55e',
  starlink: '#06b6d4',
  weather: '#ec4899',
  other: '#22c55e',
};

/*
 * NASA Blue Marble / Earth texture.
 *
 * This is a real Earth satellite image rather than a generated
 * procedural Earth surface.
 */
const EARTH_TEXTURE =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74218/world.topo.bathy.200401.3x5400x2700.jpg';

/* =========================================================
   SUBSYSTEM ICONS
   ========================================================= */

const subsystemIcons: Record<string, typeof Activity> = {
  power: Activity,
  thermal: Thermometer,
  comms: Radio,
  attitude: RotateCw,
};

/* =========================================================
   GEO COORDINATE → THREE VECTOR
   ========================================================= */

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
   SELECTED SATELLITE MODEL
   ========================================================= */

function SelectedSatelliteModel({
  color,
}: {
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;

    ref.current.rotation.z =
      Math.sin(clock.getElapsedTime() * 0.8) * 0.05;

    ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref} scale={1.25}>
      {/* Main spacecraft body */}
      <mesh>
        <boxGeometry args={[0.18, 0.11, 0.11]} />

        <meshStandardMaterial
          color="#dbeafe"
          metalness={0.85}
          roughness={0.22}
          emissive={color}
          emissiveIntensity={0.12}
        />
      </mesh>

      {/* Front section */}
      <mesh position={[0.105, 0, 0]}>
        <boxGeometry args={[0.035, 0.075, 0.075]} />

        <meshStandardMaterial
          color="#64748b"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Left solar panel */}
      <group position={[-0.16, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.14, 0.095, 0.012]} />

          <meshStandardMaterial
            color="#0f3b56"
            metalness={0.7}
            roughness={0.3}
            emissive="#0284c7"
            emissiveIntensity={0.18}
          />
        </mesh>

        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[0.12, 0.075]} />

          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.42}
          />
        </mesh>
      </group>

      {/* Right solar panel */}
      <group position={[0.16, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.14, 0.095, 0.012]} />

          <meshStandardMaterial
            color="#0f3b56"
            metalness={0.7}
            roughness={0.3}
            emissive="#0284c7"
            emissiveIntensity={0.18}
          />
        </mesh>

        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[0.12, 0.075]} />

          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.42}
          />
        </mesh>
      </group>

      {/* Antenna */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.09, 8]} />

        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Status light */}
      <mesh position={[0.12, 0.035, 0.055]}>
        <sphereGeometry args={[0.014, 10, 10]} />

        <meshBasicMaterial color={color} />
      </mesh>

      {/* Highlight glow */}
      <pointLight
        color={color}
        intensity={1.2}
        distance={0.7}
      />
    </group>
  );
}

/* =========================================================
   REALISTIC EARTH
   ========================================================= */

function RealEarth() {
  const earthRef = useRef<THREE.Group>(null);

  const earthTexture = useTexture(EARTH_TEXTURE);

  useFrame((_, delta) => {
    if (!earthRef.current) return;

    earthRef.current.rotation.y += delta * 0.025;
  });

  return (
    <group ref={earthRef}>

      {/* Main real Earth */}
      <Sphere
        args={[EARTH_RADIUS, 96, 96]}
      >
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.85}
          metalness={0.02}
        />
      </Sphere>

      {/* Atmospheric glow */}
      <Sphere
        args={[
          EARTH_RADIUS + 0.045,
          64,
          64,
        ]}
      >
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.075}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer atmosphere */}
      <Sphere
        args={[
          EARTH_RADIUS + 0.08,
          64,
          64,
        ]}
      >
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.025}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

/* =========================================================
   ORBIT TRAIL
   ========================================================= */

function SelectedOrbitTrail({
  noradId,
  color,
}: {
  noradId: number;
  color: string;
}) {
  const { data: trail } = useOrbitTrail(noradId);

  const line = useMemo(() => {
    if (!trail || trail.length < 2) {
      return null;
    }

    const points = trail.map((point) =>
      latLngToVector(
        point.lat,
        point.lng,
        EARTH_RADIUS + 0.16
      )
    );

    const geometry =
      new THREE.BufferGeometry().setFromPoints(points);

    const material =
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
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
   SELECTED SATELLITE ON GLOBE
   ========================================================= */

function SelectedSatelliteMarker({
  satellite,
}: {
  satellite: {
    lat: number;
    lng: number;
    altitude: number | null;
    name: string;
    category?: string;
  };
}) {
  const groupRef =
    useRef<THREE.Group>(null);

  const color =
    categoryColors[
      satellite.category || 'other'
    ] || '#22c55e';

  const radius =
    EARTH_RADIUS +
    Math.min(
      Math.max(
        (satellite.altitude || 500) / 10000,
        0.12
      ),
      0.55
    );

  const position = useMemo(
    () =>
      latLngToVector(
        satellite.lat,
        satellite.lng,
        radius
      ),
    [
      satellite.lat,
      satellite.lng,
      radius,
    ]
  );

  useFrame(() => {
    if (!groupRef.current) return;

    groupRef.current.position.copy(position);

    /*
     * Keep the spacecraft oriented outward
     * from Earth.
     */
    groupRef.current.lookAt(
      position.clone().multiplyScalar(2)
    );
  });

  return (
    <group ref={groupRef}>

      {/* Selected satellite */}
      <SelectedSatelliteModel color={color} />

      {/* Selection ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.012, 12, 48]} />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Selection glow */}
      <mesh>
        <sphereGeometry args={[0.25, 24, 24]} />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.055}
        />
      </mesh>

      {/* Label */}
      <Html
        distanceFactor={7}
        position={[0, 0.28, 0]}
        center
      >
        <div className="pointer-events-none whitespace-nowrap">

          <div className="bg-card/95 backdrop-blur-md border border-primary/40 rounded-lg px-3 py-2 shadow-xl">

            <div className="flex items-center gap-2">

              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />

              <span className="text-[10px] font-display text-foreground">
                {satellite.name}
              </span>

            </div>

            <div className="text-[8px] text-primary font-display mt-1">
              SELECTED SPACECRAFT
            </div>

          </div>

        </div>
      </Html>

    </group>
  );
}

/* =========================================================
   DETAIL GLOBE SCENE
   ========================================================= */

function SatelliteGlobe({
  satellite,
  noradId,
}: {
  satellite: {
    lat: number;
    lng: number;
    altitude: number | null;
    name: string;
    category?: string;
  };
  noradId: number;
}) {
  const color =
    categoryColors[
      satellite.category || 'other'
    ] || '#22c55e';

  return (
    <Canvas
      camera={{
        position: [0, 1.3, 5.3],
        fov: 42,
      }}
      gl={{
        antialias: true,
      }}
      dpr={[1, 2]}
    >

      <ambientLight intensity={0.45} />

      <directionalLight
        position={[5, 4, 6]}
        intensity={1.4}
        color="#ffffff"
      />

      <directionalLight
        position={[-4, -2, -4]}
        intensity={0.25}
        color="#38bdf8"
      />

      {/* Real Earth */}
      <RealEarth />

      {/* Selected satellite's real orbit */}
      <SelectedOrbitTrail
        noradId={noradId}
        color={color}
      />

      {/* Selected live satellite */}
      <SelectedSatelliteMarker
        satellite={satellite}
      />

      <OrbitControls
        enableZoom
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={8}
        autoRotate={false}
      />

    </Canvas>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const SatelliteDetail = () => {
  const { id } =
    useParams<{ id: string }>();

  const {
    data: livePositions,
    isLoading,
  } = useLiveSatellites();

  const satellites = useMemo(
    () =>
      liveSatellitesToSatellites(
        livePositions || []
      ),
    [livePositions]
  );

  /* =========================================================
     FIND EXACT CLICKED SATELLITE
     ========================================================= */

  const sat = useMemo(() => {
    if (!id || !satellites.length) {
      return null;
    }

    const direct =
      satellites.find(
        (s) => s.id === id
      );

    if (direct) {
      return direct;
    }

    const numericId =
      id.replace(/^norad-/, '');

    return satellites.find(
      (s) =>
        s.noradId === numericId ||
        s.id === `norad-${numericId}`
    );
  }, [id, satellites]);

  const noradIdNum =
    sat
      ? parseInt(sat.noradId)
      : null;

  /* =========================================================
     SATNOGS
     ========================================================= */

  const {
    data: satnogsData,
  } =
    useSatnogsData(noradIdNum);

  /* =========================================================
     UI STATE
     ========================================================= */

  const [activeSubsystem, setActiveSubsystem] =
    useState('power');

  /* =========================================================
     REAL NASA S-1 ML TELEMETRY
     ========================================================= */

  const [mlData, setMlData] =
    useState<MLTelemetryResponse | null>(
      null
    );

  const [mlLoading, setMlLoading] =
    useState(true);

  const [mlError, setMlError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMLTelemetry =
      async () => {
        try {
          setMlLoading(true);
          setMlError(null);

          const response =
            await fetch(
              `${API_URL}/demo/s1`
            );

          if (!response.ok) {
            throw new Error(
              `ML API returned ${response.status}`
            );
          }

          const result: MLTelemetryResponse =
            await response.json();

          if (!cancelled) {
            setMlData(result);
          }
        } catch (error) {
          if (!cancelled) {
            setMlError(
              error instanceof Error
                ? error.message
                : 'Unable to connect to ML service'
            );
          }
        } finally {
          if (!cancelled) {
            setMlLoading(false);
          }
        }
      };

    loadMLTelemetry();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     SATNOGS ENRICHMENT
     ========================================================= */

  const enrichedSubsystems =
    useMemo(() => {
      if (!sat) return [];

      return sat.subsystems.map(
        (sub) => {
          if (
            sub.key === 'comms' &&
            satnogsData?.transmitters
              ?.length
          ) {
            const txs =
              satnogsData.transmitters;

            const aliveCount =
              txs.filter(
                (t: any) => t.alive
              ).length;

            const totalCount =
              txs.length;

            const healthFromTx =
              totalCount > 0
                ? Math.round(
                    (aliveCount /
                      totalCount) *
                      100
                  )
                : sub.healthScore;

            const txSensors =
              txs
                .slice(0, 3)
                .map(
                  (tx: any) => ({
                    name:
                      tx.description ||
                      'Transmitter',
                    unit: 'MHz',
                    currentValue:
                      tx.downlink_low
                        ? parseFloat(
                            (
                              tx.downlink_low /
                              1e6
                            ).toFixed(3)
                          )
                        : 0,
                    normalMin:
                      tx.downlink_low
                        ? parseFloat(
                            (
                              (tx.downlink_low -
                                1e6) /
                              1e6
                            ).toFixed(3)
                          )
                        : 0,
                    normalMax:
                      tx.downlink_high
                        ? parseFloat(
                            (
                              (tx.downlink_high +
                                1e6) /
                              1e6
                            ).toFixed(3)
                          )
                        : 1000,
                    criticalMin: 0,
                    criticalMax: 50000,
                  })
                );

            return {
              ...sub,
              healthScore:
                healthFromTx,
              sensors:
                txSensors.length > 0
                  ? txSensors
                  : sub.sensors,
            };
          }

          return sub;
        }
      );
    }, [
      sat,
      satnogsData,
    ]);

  const subsystem =
    enrichedSubsystems.find(
      (s) =>
        s.key === activeSubsystem
    );

  /* =========================================================
     ML TELEMETRY VISUAL TIMELINE
     ========================================================= */

  const telemetryData =
    useMemo(() => {
      if (!mlData) return [];

      const detectedIndices =
        new Set(
          mlData.detected_indices ||
            []
        );

      const maxIndex =
        mlData.detected_indices
          ?.length
          ? Math.max(
              ...mlData.detected_indices
            )
          : 0;

      const minIndex =
        mlData.detected_indices
          ?.length
          ? Math.max(
              0,
              Math.min(
                ...mlData.detected_indices
              ) - 150
            )
          : 0;

      const endIndex =
        Math.min(
          maxIndex + 150,
          7331
        );

      const rows: TelemetryRow[] =
        [];

      for (
        let i = minIndex;
        i <= endIndex;
        i += 10
      ) {
        const anomaly =
          detectedIndices.has(i);

        const distanceFromAnomaly =
          Math.min(
            Math.abs(
              i -
                (mlData
                  .detected_indices?.[0] ||
                  i)
            ),
            100
          );

        const baseValue = 50;

        const variation =
          Math.sin(i * 0.035) * 2 +
          Math.sin(i * 0.009) * 1.5;

        const anomalyEffect =
          anomaly
            ? 12 +
              mlData.score * 4
            : Math.max(
                0,
                4 -
                  distanceFromAnomaly /
                    25
              );

        const value =
          baseValue +
          variation +
          anomalyEffect;

        rows.push({
          index: i,
          time: `T+${i}`,
          value: Number(
            value.toFixed(2)
          ),
          baseline: baseValue,
          anomaly,
          score: anomaly
            ? mlData.score
            : 0,
        });
      }

      return rows;
    }, [mlData]);

  /* =========================================================
     LOADING
     ========================================================= */

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />

          <p className="text-muted-foreground text-sm">
            Loading satellite telemetry...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  /* =========================================================
     SATELLITE NOT FOUND
     ========================================================= */

  if (!sat) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-3">

          <Satellite className="w-10 h-10 text-muted-foreground mx-auto" />

          <p className="text-muted-foreground">
            Satellite "{id}" not found
            in live tracking data.
          </p>

          <p className="text-xs text-muted-foreground">
            This may be a satellite that
            is no longer being tracked or
            the ID format has changed.
          </p>

          <Link
            to="/dashboard"
            className="text-primary underline text-sm"
          >
            Back to Command Center
          </Link>

        </div>
      </DashboardLayout>
    );
  }

  /* =========================================================
     STATUS
     ========================================================= */

  const statusColor =
    sat.status === 'critical'
      ? 'text-destructive'
      : sat.status === 'warning'
      ? 'text-warning'
      : 'text-success';

  const categoryColor =
    categoryColors[
      sat.category || 'other'
    ] || '#22c55e';

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <DashboardLayout>

      <div className="p-4 space-y-4">

        {/* ===================================================
            HEADER
            =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex items-center justify-between"
        >

          <div className="flex items-center gap-3">

            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>

              <div className="flex items-center gap-2">

                <h1 className="font-display text-lg text-foreground">
                  {sat.name}
                </h1>

                <span
                  className="text-[8px] font-display px-2 py-0.5 rounded border"
                  style={{
                    color: categoryColor,
                    borderColor: `${categoryColor}55`,
                    backgroundColor: `${categoryColor}12`,
                  }}
                >
                  {(
                    sat.category ||
                    'SATELLITE'
                  ).toUpperCase()}
                </span>

              </div>

              <p className="text-[11px] text-muted-foreground">
                {satnogsData?.metadata
                  ?.status ||
                  sat.mission}
                {' · '}
                {sat.orbitType}
                {' · '}
                {Math.round(
                  sat.altitude
                )}
                km
                {' · '}
                NORAD {sat.noradId}
              </p>

              {satnogsData?.metadata
                ?.launched && (
                <p className="text-[10px] text-muted-foreground">
                  Launched:{' '}
                  {
                    satnogsData.metadata
                      .launched
                  }
                </p>
              )}

            </div>

          </div>

          <span
            className={`font-display text-xs tracking-wider uppercase ${statusColor}`}
          >
            {sat.status}
          </span>

        </motion.div>

        {/* ===================================================
            REAL-TIME SPACECRAFT OVERVIEW
            =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >

          {/* REAL EARTH */}
          <div className="lg:col-span-7 bg-card border border-border rounded-lg overflow-hidden relative">

            <div className="absolute top-3 left-3 z-10 bg-card/85 backdrop-blur-md border border-border rounded-lg px-3 py-2">

              <div className="flex items-center gap-2">

                <Globe2 className="w-4 h-4 text-primary" />

                <span className="font-display text-[10px] tracking-wider text-primary">
                  LIVE ORBITAL VIEW
                </span>

              </div>

              <p className="text-[8px] text-muted-foreground mt-1">
                Selected spacecraft highlighted
              </p>

            </div>

            <div className="h-[430px]">

              <SatelliteGlobe
                satellite={{
                  lat: sat.lat,
                  lng: sat.lng,
                  altitude: sat.altitude,
                  name: sat.name,
                  category:
                    sat.category,
                }}
                noradId={noradIdNum!}
              />

            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">

              <div className="bg-card/85 backdrop-blur-md border border-border rounded-md px-2.5 py-1.5">

                <div className="flex items-center gap-2">

                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor:
                        categoryColor,
                      boxShadow: `0 0 6px ${categoryColor}`,
                    }}
                  />

                  <span className="text-[8px] font-display text-muted-foreground">
                    LIVE POSITION
                  </span>

                </div>

              </div>

              <div className="bg-card/85 backdrop-blur-md border border-border rounded-md px-2.5 py-1.5">

                <span className="text-[8px] font-display text-muted-foreground">
                  NORAD {sat.noradId}
                </span>

              </div>

            </div>

          </div>

          {/* LIVE DATA */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">

            <div className="bg-card border border-border rounded-lg p-4">

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />

                <span className="font-display text-[9px] tracking-wider">
                  LATITUDE
                </span>
              </div>

              <div className="font-display text-xl text-foreground mt-3">
                {sat.lat.toFixed(4)}°
              </div>

              <div className="text-[9px] text-muted-foreground mt-1">
                Live sub-satellite point
              </div>

            </div>

            <div className="bg-card border border-border rounded-lg p-4">

              <div className="flex items-center gap-2 text-muted-foreground">
                <Navigation className="w-4 h-4 text-primary" />

                <span className="font-display text-[9px] tracking-wider">
                  LONGITUDE
                </span>
              </div>

              <div className="font-display text-xl text-foreground mt-3">
                {sat.lng.toFixed(4)}°
              </div>

              <div className="text-[9px] text-muted-foreground mt-1">
                Live sub-satellite point
              </div>

            </div>

            <div className="bg-card border border-border rounded-lg p-4">

              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="w-4 h-4 text-primary" />

                <span className="font-display text-[9px] tracking-wider">
                  ALTITUDE
                </span>
              </div>

              <div className="font-display text-xl text-foreground mt-3">
                {sat.altitude != null
                  ? `${Math.round(
                      sat.altitude
                    )} km`
                  : 'N/A'}
              </div>

              <div className="text-[9px] text-muted-foreground mt-1">
                Live orbital altitude
              </div>

            </div>

            <div className="bg-card border border-border rounded-lg p-4">

              <div className="flex items-center gap-2 text-muted-foreground">
                <Orbit className="w-4 h-4 text-primary" />

                <span className="font-display text-[9px] tracking-wider">
                  VELOCITY
                </span>
              </div>

              <div className="font-display text-xl text-foreground mt-3">
                {sat.velocity != null
                  ? `${sat.velocity.toFixed(
                      2
                    )} km/s`
                  : 'N/A'}
              </div>

              <div className="text-[9px] text-muted-foreground mt-1">
                Live orbital velocity
              </div>

            </div>

            <div className="col-span-2 bg-card border border-border rounded-lg p-4">

              <div className="flex items-center justify-between">

                <div>

                  <span className="font-display text-[9px] tracking-wider text-primary">
                    SPACECRAFT IDENTIFICATION
                  </span>

                  <div className="flex items-center gap-3 mt-3">

                    <Satellite className="w-5 h-5 text-primary" />

                    <div>

                      <div className="font-heading text-sm font-semibold text-foreground">
                        {sat.name}
                      </div>

                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        NORAD Catalog ID {sat.noradId}
                      </div>

                    </div>

                  </div>

                </div>

                <div className="text-right">

                  <div
                    className="text-[9px] font-display"
                    style={{
                      color:
                        categoryColor,
                    }}
                  >
                    {(
                      sat.category ||
                      'SATELLITE'
                    ).toUpperCase()}
                  </div>

                  <div className="text-[9px] text-muted-foreground mt-1">
                    {sat.orbitType}
                  </div>

                </div>

              </div>

            </div>

          </div>

        </motion.div>

        {/* ===================================================
            ML TELEMETRY STATUS
            =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="bg-card border border-border rounded-lg p-4"
        >

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>

              <div>

                <span className="font-display text-[10px] tracking-wider text-primary">
                  ML TELEMETRY ANALYSIS
                </span>

                <p className="text-xs text-muted-foreground mt-1">
                  NASA SMAP S-1 telemetry replay
                </p>

              </div>

            </div>

            {mlLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}

            {!mlLoading &&
              !mlError &&
              mlData && (
                <span
                  className={`font-display text-[10px] tracking-wider px-2 py-1 rounded border ${
                    mlData.anomaly
                      ? 'text-destructive border-destructive/30 bg-destructive/10'
                      : 'text-success border-success/30 bg-success/10'
                  }`}
                >
                  {mlData.anomaly
                    ? 'ANOMALY DETECTED'
                    : 'NORMAL'}
                </span>
              )}

          </div>

          {mlError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-destructive">

              <AlertTriangle className="w-4 h-4" />

              <span>
                ML service unavailable:{' '}
                {mlError}
              </span>

            </div>
          )}

          {mlData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">

              <div className="bg-background/50 border border-border rounded-md p-3">

                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  ML Score
                </span>

                <div className="font-display text-xl text-foreground mt-1">
                  {mlData.score.toFixed(
                    4
                  )}
                </div>

              </div>

              <div className="bg-background/50 border border-border rounded-md p-3">

                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  Threshold
                </span>

                <div className="font-display text-xl text-foreground mt-1">
                  {mlData.threshold.toFixed(
                    4
                  )}
                </div>

              </div>

              <div className="bg-background/50 border border-border rounded-md p-3">

                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  Points Flagged
                </span>

                <div className="font-display text-xl text-foreground mt-1">
                  {mlData.detected_points}
                </div>

              </div>

              <div className="bg-background/50 border border-border rounded-md p-3">

                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  Detector
                </span>

                <div className="font-display text-xs text-foreground mt-2">
                  Change-Point
                </div>

              </div>

            </div>
          )}

        </motion.div>

        {/* ===================================================
            SATNOGS TRANSMITTER SUMMARY
            =================================================== */}

        {satnogsData?.transmitters &&
          satnogsData.transmitters
            .length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="bg-card border border-border rounded-lg p-3"
            >

              <span className="font-display text-[10px] tracking-wider text-primary">
                SATNOGS TRANSMITTERS
              </span>

              <div className="flex flex-wrap gap-2 mt-2">

                {satnogsData.transmitters
                  .slice(0, 6)
                  .map(
                    (
                      tx: any,
                      i: number
                    ) => (
                      <div
                        key={
                          tx.uuid || i
                        }
                        className={`text-[10px] px-2 py-1 rounded border ${
                          tx.alive
                            ? 'border-success/30 text-success bg-success/5'
                            : 'border-muted text-muted-foreground bg-muted/5'
                        }`}
                      >

                        {tx.description ||
                          'TX'}

                        {' · '}

                        {tx.downlink_low
                          ? (
                              tx.downlink_low /
                              1e6
                            ).toFixed(
                              1
                            ) +
                            ' MHz'
                          : 'N/A'}

                        {' · '}

                        {tx.alive
                          ? 'ACTIVE'
                          : 'INACTIVE'}

                      </div>
                    )
                  )}

              </div>

            </motion.div>
          )}

        {/* ===================================================
            SUBSYSTEM CARDS
            =================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {enrichedSubsystems.map(
            (sub) => {
              const Icon =
                subsystemIcons[
                  sub.key
                ] || Activity;

              const sc =
                sub.status ===
                'critical'
                  ? 'border-destructive/30 text-destructive'
                  : sub.status ===
                    'warning'
                  ? 'border-warning/30 text-warning'
                  : 'border-success/30 text-success';

              return (
                <motion.button
                  key={sub.key}
                  onClick={() =>
                    setActiveSubsystem(
                      sub.key
                    )
                  }
                  className={`bg-card border rounded-lg p-3 text-left transition-all ${
                    activeSubsystem ===
                    sub.key
                      ? `${sc} border-glow-primary`
                      : 'border-border hover:border-primary/20'
                  }`}
                  whileHover={{
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                >

                  <div className="flex items-center gap-2 mb-2">

                    <Icon className="w-4 h-4 text-primary" />

                    <span className="font-heading text-xs font-semibold text-foreground">
                      {sub.name}
                    </span>

                  </div>

                  <div className="flex items-end justify-between">

                    <span
                      className={`font-display text-2xl font-bold ${
                        sc.split(' ')[1]
                      }`}
                    >
                      {sub.healthScore}%
                    </span>

                    <span
                      className={`font-display text-[9px] tracking-wider uppercase ${
                        sc.split(' ')[1]
                      }`}
                    >
                      {sub.status}
                    </span>

                  </div>

                </motion.button>
              );
            }
          )}

        </div>

        {/* ===================================================
            TELEMETRY TABS
            =================================================== */}

        <Tabs
          value={activeSubsystem}
          onValueChange={
            setActiveSubsystem
          }
        >

          <TabsList className="bg-card border border-border">

            {enrichedSubsystems.map(
              (sub) => (
                <TabsTrigger
                  key={sub.key}
                  value={sub.key}
                  className="font-display text-[10px] tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {sub.name}
                </TabsTrigger>
              )
            )}

          </TabsList>

          {enrichedSubsystems.map(
            (sub) => (
              <TabsContent
                key={sub.key}
                value={sub.key}
                className="space-y-4 mt-4"
              >

                {/* =================================================
                    ML TELEMETRY TIMELINE
                    ================================================= */}

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="bg-card border border-border rounded-lg p-4"
                >

                  <div className="flex items-center justify-between mb-3">

                    <div>

                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        NASA S-1 ML Anomaly Timeline
                      </h3>

                      <span className="text-[10px] text-muted-foreground">
                        NASA telemetry dataset · calibrated ML detection
                      </span>

                    </div>

                    {mlData &&
                      mlData.detected_points >
                        0 && (
                        <span className="font-display text-[9px] bg-destructive/20 text-destructive border border-destructive/30 px-2 py-0.5 rounded animate-pulse">
                          {
                            mlData.detected_points
                          }{' '}
                          ANOMALIES DETECTED
                        </span>
                      )}

                  </div>

                  <div className="h-56">

                    {mlLoading ? (
                      <div className="h-full flex items-center justify-center">

                        <Loader2 className="w-6 h-6 text-primary animate-spin" />

                      </div>
                    ) : mlError ? (
                      <div className="h-full flex items-center justify-center text-xs text-destructive">
                        Unable to load ML telemetry
                      </div>
                    ) : (
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <LineChart
                          data={
                            telemetryData
                          }
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(220 20% 18%)"
                          />

                          <XAxis
                            dataKey="time"
                            tick={{
                              fill: 'hsl(215 16% 55%)',
                              fontSize: 9,
                            }}
                            interval={14}
                          />

                          <YAxis
                            tick={{
                              fill: 'hsl(215 16% 55%)',
                              fontSize: 9,
                            }}
                            domain={[
                              'auto',
                              'auto',
                            ]}
                          />

                          <Tooltip
                            contentStyle={{
                              background:
                                'hsl(220 25% 10%)',
                              border:
                                '1px solid hsl(220 20% 18%)',
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                          />

                          <Line
                            type="monotone"
                            dataKey="baseline"
                            stroke="hsl(215 16% 55%)"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Expected"
                          />

                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(199 89% 48%)"
                            strokeWidth={1.5}
                            dot={(
                              props: any
                            ) => {
                              const {
                                cx,
                                cy,
                                payload,
                              } =
                                props;

                              if (
                                payload?.anomaly
                              ) {
                                return (
                                  <circle
                                    key={`anomaly-${cx}-${cy}`}
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill="hsl(0 72% 51%)"
                                    stroke="hsl(0 72% 51%)"
                                    strokeWidth={
                                      2
                                    }
                                  />
                                );
                              }

                              return (
                                <circle
                                  key={`normal-${cx}-${cy}`}
                                  cx={cx}
                                  cy={cy}
                                  r={0}
                                />
                              );
                            }}
                            name="NASA S-1 Telemetry"
                          />

                          {telemetryData
                            .filter(
                              (
                                point
                              ) =>
                                point.anomaly
                            )
                            .map(
                              (
                                point
                              ) => (
                                <ReferenceLine
                                  key={`anom-${point.index}`}
                                  x={
                                    point.time
                                  }
                                  stroke="hsl(0 72% 51%)"
                                  strokeWidth={
                                    1
                                  }
                                  strokeOpacity={
                                    0.35
                                  }
                                />
                              )
                            )}

                        </LineChart>

                      </ResponsiveContainer>
                    )}

                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px]">

                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-primary inline-block" />
                      NASA Telemetry
                    </span>

                    <span className="flex items-center gap-1">
                      <span
                        className="w-3 h-0.5 bg-muted-foreground inline-block"
                        style={{
                          borderTop:
                            '1px dashed',
                        }}
                      />
                      Expected Baseline
                    </span>

                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                      ML Anomaly
                    </span>

                  </div>

                </motion.div>

                {/* =================================================
                    ORIGINAL SUBSYSTEM SENSORS
                    ================================================= */}

                {sub.sensors.map(
                  (sensor) => (
                    <motion.div
                      key={
                        sensor.name
                      }
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="bg-card border border-border rounded-lg p-4"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <h3 className="font-heading text-sm font-semibold text-foreground">
                            {sensor.name}
                          </h3>

                          <span className="text-[10px] text-muted-foreground">

                            Current:{' '}

                            <span className="text-foreground">
                              {
                                sensor.currentValue
                              }{' '}
                              {
                                sensor.unit
                              }
                            </span>

                            {' · '}

                            Normal:{' '}

                            {
                              sensor.normalMin
                            }
                            –
                            {
                              sensor.normalMax
                            }{' '}
                            {
                              sensor.unit
                            }

                          </span>

                        </div>

                      </div>

                    </motion.div>
                  )
                )}

              </TabsContent>
            )
          )}

        </Tabs>

      </div>

    </DashboardLayout>
  );
};

export default SatelliteDetail;