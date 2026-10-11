import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { motion } from 'framer-motion';
import {
  Filter,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const severityColors = {
  low: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-muted',
  },
  medium: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
  },
  high: {
    bg: 'bg-warning/20',
    text: 'text-warning',
    border: 'border-warning/50',
  },
  critical: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
  },
};

type Severity = keyof typeof severityColors;

const AnomalyEngine = () => {
  const {
    data: mlResult,
    isLoading: mlLoading,
    isError: mlError,
  } = useAnomalyDetection();

  const [filterSeverity, setFilterSeverity] =
    useState<string>('all');

  const [filterSatellite, setFilterSatellite] =
    useState<string>('all');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  /*
   * ------------------------------------------------------------
   * REAL ML RESULT → UI EVENT
   * ------------------------------------------------------------
   */

  const anomalyEvents = useMemo(() => {
    if (!mlResult) return [];

    const ratio =
      mlResult.threshold > 0
        ? mlResult.score / mlResult.threshold
        : 0;

    let severity: Severity = 'low';

    if (mlResult.anomaly) {
      if (ratio >= 1.5) {
        severity = 'critical';
      } else if (ratio >= 1.25) {
        severity = 'high';
      } else {
        severity = 'medium';
      }
    }

    return [
      {
        id: 'nasa-s1-ml-anomaly',
        satelliteId: 'NASA-S1',
        satelliteName: 'NASA SMAP S-1',
        subsystem: 'Spacecraft Telemetry',
        sensor: 'Multivariate Change-Point Detector',

        score: mlResult.score,
        threshold: mlResult.threshold,

        severity,

        resolved: !mlResult.anomaly,

        detectedPoints:
          mlResult.detected_points,

        detectedIndices:
          mlResult.detected_indices,

        detector:
          mlResult.detector,

        demoIndex:
          mlResult.demo_index,

        dataset:
          mlResult.dataset,

        rootCause: mlResult.anomaly
          ? `The ML detector identified a multivariate telemetry distribution change. The anomaly score is ${mlResult.score.toFixed(
              4
            )}, above the calibrated threshold of ${mlResult.threshold.toFixed(
              4
            )}. The detector flagged ${
              mlResult.detected_points
            } telemetry points in the NASA S-1 dataset.`
          : `No anomaly was detected. The current score of ${mlResult.score.toFixed(
              4
            )} is below the calibrated threshold of ${mlResult.threshold.toFixed(
              4
            )}.`,

        actionTaken: mlResult.anomaly
          ? 'Anomaly flagged for operator review.'
          : 'Telemetry remains within the calibrated detection boundary.',
      },
    ];
  }, [mlResult]);

  /*
   * ------------------------------------------------------------
   * SCORE / THRESHOLD RATIO
   * ------------------------------------------------------------
   */

  const scoreRatio =
    mlResult && mlResult.threshold > 0
      ? mlResult.score / mlResult.threshold
      : 0;

  /*
   * ------------------------------------------------------------
   * REAL TELEMETRY INDICES
   * ------------------------------------------------------------
   */

  const timeline = useMemo(() => {
    if (
      !mlResult ||
      !mlResult.detected_indices ||
      mlResult.detected_indices.length === 0
    ) {
      return {
        indices: [] as number[],
        min: 0,
        max: 0,
      };
    }

    const indices =
      [...mlResult.detected_indices].sort(
        (a, b) => a - b
      );

    return {
      indices,
      min: indices[0],
      max: indices[indices.length - 1],
    };
  }, [mlResult]);

  /*
   * ------------------------------------------------------------
   * FILTERING
   * ------------------------------------------------------------
   */

  const filteredEvents = anomalyEvents.filter(
    (event) => {
      if (
        filterSeverity !== 'all' &&
        event.severity !== filterSeverity
      ) {
        return false;
      }

      if (
        filterSatellite !== 'all' &&
        event.satelliteId !== filterSatellite
      ) {
        return false;
      }

      if (searchTerm) {
        const search =
          searchTerm.toLowerCase();

        const matchesSubsystem =
          event.subsystem
            .toLowerCase()
            .includes(search);

        const matchesSensor =
          event.sensor
            .toLowerCase()
            .includes(search);

        if (
          !matchesSubsystem &&
          !matchesSensor
        ) {
          return false;
        }
      }

      return true;
    }
  );

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">

        {/* HEADER */}

        <div>
          <h1 className="font-display text-lg text-foreground">
            Anomaly Detection Engine
          </h1>

          <p className="text-xs text-muted-foreground">
            Real ML-powered anomaly detection using NASA S-1
            spacecraft telemetry
          </p>
        </div>

        {/* =====================================================
            ML STATUS CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          {/* ML DETECTOR */}

          <div className="bg-card border border-border rounded-lg p-4">

            <div className="flex items-center gap-2 mb-2">

              <Activity className="w-4 h-4 text-primary" />

              <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                ML Detector
              </span>

            </div>

            <p className="text-sm text-foreground">

              {mlLoading
                ? 'Loading...'
                : mlError
                  ? 'API Offline'
                  : 'Online'}

            </p>

          </div>

          {/* SCORE */}

          <div className="bg-card border border-border rounded-lg p-4">

            <div className="flex items-center gap-2 mb-2">

              <AlertTriangle className="w-4 h-4 text-warning" />

              <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                Anomaly Score
              </span>

            </div>

            <p className="text-lg font-display text-foreground">

              {mlResult
                ? mlResult.score.toFixed(4)
                : '--'}

            </p>

          </div>

          {/* THRESHOLD */}

          <div className="bg-card border border-border rounded-lg p-4">

            <div className="flex items-center gap-2 mb-2">

              <Activity className="w-4 h-4 text-primary" />

              <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                Threshold
              </span>

            </div>

            <p className="text-lg font-display text-foreground">

              {mlResult
                ? mlResult.threshold.toFixed(4)
                : '--'}

            </p>

          </div>

          {/* DETECTION */}

          <div className="bg-card border border-border rounded-lg p-4">

            <div className="flex items-center gap-2 mb-2">

              {mlResult?.anomaly ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-success" />
              )}

              <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                Detection
              </span>

            </div>

            <p
              className={`text-sm font-display ${
                mlResult?.anomaly
                  ? 'text-destructive'
                  : 'text-success'
              }`}
            >

              {mlLoading
                ? 'Checking...'
                : mlError
                  ? 'Unavailable'
                  : mlResult?.anomaly
                    ? 'ANOMALY DETECTED'
                    : 'NORMAL'}

            </p>

          </div>

        </div>

        {/* =====================================================
            DETECTION MARGIN
        ====================================================== */}

        {!mlLoading &&
          !mlError &&
          mlResult && (

            <div className="bg-card border border-border rounded-lg px-4 py-3">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                    Detection Margin
                  </span>

                  <p className="text-xs text-foreground mt-1">

                    Current score is{' '}

                    <span className="font-semibold">
                      {scoreRatio.toFixed(2)}×
                    </span>{' '}

                    the calibrated threshold.

                  </p>

                </div>

                <div className="text-right">

                  <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                    Points Flagged
                  </span>

                  <p className="text-sm font-display text-foreground mt-1">
                    {mlResult.detected_points}
                  </p>

                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            REAL TELEMETRY ANOMALY TIMELINE
        ====================================================== */}

        {!mlLoading &&
          !mlError &&
          mlResult &&
          timeline.indices.length > 0 && (

            <div className="bg-card border border-border rounded-lg p-5">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <h2 className="font-display text-xs tracking-wider text-primary uppercase">
                    Telemetry Anomaly Timeline
                  </h2>

                  <p className="text-[10px] text-muted-foreground mt-1">
                    Real detected points returned by the S-1
                    ML change-point detector
                  </p>

                </div>

                <div className="text-right">

                  <span className="font-display text-[9px] tracking-wider text-muted-foreground uppercase">
                    Detected Points
                  </span>

                  <p className="text-sm font-display text-foreground">
                    {timeline.indices.length}
                  </p>

                </div>

              </div>

              {/* TIMELINE */}

              <div className="relative h-20">

                {/* BASE LINE */}

                <div className="absolute left-0 right-0 top-8 h-1 bg-secondary rounded-full" />

                {/* DETECTION MARKERS */}

                {timeline.indices.map(
                  (index) => {

                    const position =
                      timeline.max > 0
                        ? (index /
                            timeline.max) *
                          100
                        : 0;

                    return (
                      <div
                        key={index}
                        title={`Telemetry index ${index}`}
                        className="absolute top-[26px] w-1 h-5 bg-destructive rounded-full"
                        style={{
                          left: `${position}%`,
                        }}
                      />
                    );
                  }
                )}

                {/* FIRST DETECTION */}

                <div className="absolute left-0 top-0">

                  <span className="text-[9px] font-mono text-destructive">
                    First: {timeline.min}
                  </span>

                </div>

                {/* LAST DETECTION */}

                <div className="absolute right-0 top-0">

                  <span className="text-[9px] font-mono text-destructive">
                    Last: {timeline.max}
                  </span>

                </div>

                {/* START */}

                <div className="absolute left-0 top-12">

                  <span className="text-[9px] font-mono text-muted-foreground">
                    Index 0
                  </span>

                </div>

              </div>

              {/* TIMELINE SUMMARY */}

              <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-lg p-3">

                <div className="flex items-center gap-2">

                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />

                  <span className="font-display text-[10px] tracking-wider text-destructive uppercase">
                    Anomaly Points Detected
                  </span>

                </div>

                <p className="text-xs text-muted-foreground mt-1">

                  The detector identified{' '}

                  <span className="text-foreground font-semibold">
                    {timeline.indices.length}
                  </span>{' '}

                  anomalous telemetry points.

                </p>

              </div>

            </div>
          )}

        {/* =====================================================
            FILTERS
        ====================================================== */}

        <div className="flex flex-wrap gap-3 items-center">

          {/* SEARCH */}

          <div className="relative flex-1 min-w-[200px]">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />

            <Input
              placeholder="Search subsystem or sensor..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="pl-9 h-9 bg-card border-border text-sm"
            />

          </div>

          {/* SEVERITY */}

          <Select
            value={filterSeverity}
            onValueChange={setFilterSeverity}
          >

            <SelectTrigger className="w-[140px] h-9 bg-card border-border text-xs">

              <Filter className="w-3 h-3 mr-1" />

              <SelectValue placeholder="Severity" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="all">
                All Severity
              </SelectItem>

              <SelectItem value="critical">
                Critical
              </SelectItem>

              <SelectItem value="high">
                High
              </SelectItem>

              <SelectItem value="medium">
                Medium
              </SelectItem>

              <SelectItem value="low">
                Low
              </SelectItem>

            </SelectContent>

          </Select>

          {/* SATELLITE */}

          <Select
            value={filterSatellite}
            onValueChange={setFilterSatellite}
          >

            <SelectTrigger className="w-[180px] h-9 bg-card border-border text-xs">

              <SelectValue placeholder="Satellite" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="all">
                All Satellites
              </SelectItem>

              <SelectItem value="NASA-S1">
                NASA SMAP S-1
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* =====================================================
            API ERROR
        ====================================================== */}

        {mlError && (

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">

            <p className="text-sm text-destructive font-display">
              ML API CONNECTION ERROR
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              The anomaly detection backend at port 8001
              could not be reached.
            </p>

          </div>

        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {mlLoading && (

          <div className="bg-card border border-border rounded-lg p-8 text-center">

            <Activity className="w-5 h-5 mx-auto mb-2 text-primary animate-pulse" />

            <p className="text-xs text-muted-foreground">
              Running NASA S-1 anomaly detection...
            </p>

          </div>

        )}

        {/* =====================================================
            ANOMALY TABLE
        ====================================================== */}

        {!mlLoading &&
          !mlError && (

            <div className="bg-card border border-border rounded-lg overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-border">

                      {[
                        'Detection',
                        'Satellite',
                        'Subsystem',
                        'Sensor',
                        'Score',
                        'Severity',
                        'Status',
                      ].map((heading) => (

                        <th
                          key={heading}
                          className="px-4 py-3 text-left font-display text-[10px] tracking-wider text-muted-foreground uppercase"
                        >
                          {heading}
                        </th>

                      ))}

                    </tr>

                  </thead>

                  <tbody>

                    {filteredEvents.length === 0 ? (

                      <tr>

                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-xs text-muted-foreground"
                        >
                          No anomaly events match the
                          selected filters.
                        </td>

                      </tr>

                    ) : (

                      filteredEvents.map(
                        (event, index) => {

                          const colors =
                            severityColors[
                              event.severity
                            ];

                          const isExpanded =
                            expandedId ===
                            event.id;

                          const scorePercentage =
                            event.threshold > 0
                              ? Math.min(
                                  100,
                                  (event.score /
                                    event.threshold) *
                                    100
                                )
                              : 0;

                          return (

                            <motion.tr
                              key={event.id}
                              initial={{
                                opacity: 0,
                              }}
                              animate={{
                                opacity: 1,
                              }}
                              transition={{
                                delay:
                                  index *
                                  0.03,
                              }}
                              className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                              onClick={() =>
                                setExpandedId(
                                  isExpanded
                                    ? null
                                    : event.id
                                )
                              }
                            >

                              {/* DETECTION */}

                              <td className="px-4 py-3">

                                <div className="text-xs font-display text-foreground">
                                  ML Detection
                                </div>

                                <div className="text-[10px] text-muted-foreground">
                                  {
                                    event.detectedPoints
                                  }{' '}
                                  points flagged
                                </div>

                              </td>

                              {/* SATELLITE */}

                              <td className="px-4 py-3 text-xs font-heading font-semibold text-foreground">
                                {
                                  event.satelliteName
                                }
                              </td>

                              {/* SUBSYSTEM */}

                              <td className="px-4 py-3 text-xs text-foreground">
                                {
                                  event.subsystem
                                }
                              </td>

                              {/* SENSOR */}

                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {event.sensor}
                              </td>

                              {/* SCORE */}

                              <td className="px-4 py-3">

                                <div className="flex items-center gap-2">

                                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">

                                    <div
                                      className={`h-full rounded-full ${
                                        event.severity ===
                                        'critical'
                                          ? 'bg-destructive'
                                          : event.severity ===
                                              'high'
                                            ? 'bg-warning'
                                            : 'bg-primary'
                                      }`}
                                      style={{
                                        width: `${scorePercentage}%`,
                                      }}
                                    />

                                  </div>

                                  <span
                                    className={`text-xs font-display ${colors.text}`}
                                  >
                                    {event.score.toFixed(
                                      4
                                    )}
                                  </span>

                                </div>

                              </td>

                              {/* SEVERITY */}

                              <td className="px-4 py-3">

                                <span
                                  className={`font-display text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {
                                    event.severity
                                  }
                                </span>

                              </td>

                              {/* STATUS */}

                              <td className="px-4 py-3">

                                {event.resolved ? (

                                  <span className="font-display text-[9px] text-success bg-success/10 px-2 py-0.5 rounded">
                                    NORMAL
                                  </span>

                                ) : (

                                  <span className="font-display text-[9px] text-destructive bg-destructive/10 px-2 py-0.5 rounded animate-pulse">
                                    ACTIVE
                                  </span>

                                )}

                              </td>

                            </motion.tr>
                          );
                        }
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        {/* =====================================================
            EXPANDED ML DETAILS
        ====================================================== */}

        {expandedId &&
          (() => {

            const event =
              anomalyEvents.find(
                (item) =>
                  item.id === expandedId
              );

            if (!event) return null;

            return (

              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: 'auto',
                }}
                className="bg-card border border-primary/20 rounded-lg p-5 glow-primary"
              >

                <div className="flex items-start justify-between mb-3">

                  <div>

                    <h3 className="font-display text-xs tracking-wider text-primary">
                      ML DETECTION ANALYSIS
                    </h3>

                    <span className="text-[10px] text-muted-foreground">
                      {event.satelliteName}
                      {' · '}
                      {event.subsystem}
                      {' · '}
                      {event.sensor}
                    </span>

                  </div>

                  <span
                    className={`font-display text-[10px] ${severityColors[event.severity].text}`}
                  >
                    Score:{' '}
                    {event.score.toFixed(4)}
                  </span>

                </div>

                {/* MODEL METRICS */}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">

                  <div className="bg-secondary/30 border border-border rounded-lg p-3">

                    <span className="font-display text-[9px] tracking-wider text-muted-foreground uppercase">
                      ML Score
                    </span>

                    <p className="text-sm text-foreground mt-1 font-display">
                      {event.score.toFixed(4)}
                    </p>

                  </div>

                  <div className="bg-secondary/30 border border-border rounded-lg p-3">

                    <span className="font-display text-[9px] tracking-wider text-muted-foreground uppercase">
                      Threshold
                    </span>

                    <p className="text-sm text-foreground mt-1 font-display">
                      {event.threshold.toFixed(
                        4
                      )}
                    </p>

                  </div>

                  <div className="bg-secondary/30 border border-border rounded-lg p-3">

                    <span className="font-display text-[9px] tracking-wider text-muted-foreground uppercase">
                      Score / Threshold
                    </span>

                    <p className="text-sm text-foreground mt-1 font-display">
                      {(
                        event.score /
                        event.threshold
                      ).toFixed(2)}
                      ×
                    </p>

                  </div>

                  <div className="bg-secondary/30 border border-border rounded-lg p-3">

                    <span className="font-display text-[9px] tracking-wider text-muted-foreground uppercase">
                      Points Detected
                    </span>

                    <p className="text-sm text-foreground mt-1 font-display">
                      {
                        event.detectedPoints
                      }
                    </p>

                  </div>

                </div>

                {/* DATASET */}

                <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-3">

                  <span className="font-display text-[10px] tracking-wider text-primary">
                    DATASET
                  </span>

                  <p className="text-xs text-foreground mt-2">
                    {event.dataset ||
                      'NASA SMAP S-1 telemetry'}
                  </p>

                </div>

                {/* DETECTOR */}

                <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-3">

                  <span className="font-display text-[10px] tracking-wider text-primary">
                    DETECTOR
                  </span>

                  <p className="text-xs text-foreground mt-2">
                    {event.detector}
                  </p>

                </div>

                {/* DEMO INDEX */}

                {event.demoIndex !==
                  undefined && (

                  <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-3">

                    <span className="font-display text-[10px] tracking-wider text-primary">
                      PEAK DETECTION INDEX
                    </span>

                    <p className="text-sm text-foreground mt-2 font-display">
                      Telemetry index{' '}
                      {event.demoIndex}
                    </p>

                  </div>
                )}

                {/* EXPLANATION */}

                <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-3">

                  <span className="font-display text-[10px] tracking-wider text-primary">
                    DETECTION EXPLANATION
                  </span>

                  <p className="text-sm text-foreground leading-relaxed font-body mt-2">
                    {event.rootCause}
                  </p>

                </div>

                {/* ACTION */}

                <div className="bg-success/5 border border-success/20 rounded-lg p-4">

                  <span className="font-display text-[10px] text-success tracking-wider">
                    SYSTEM ACTION
                  </span>

                  <p className="text-sm text-foreground mt-1 font-body">
                    {event.actionTaken}
                  </p>

                </div>

              </motion.div>
            );
          })()}

      </div>
    </DashboardLayout>
  );
};

export default AnomalyEngine;