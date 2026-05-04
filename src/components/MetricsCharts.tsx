import { useMemo, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { MapHoverPoint, MetricKey, Track, TrackPoint } from "../types";
import { downsampleMetricPoints } from "../lib/simplify";
import { formatDistance, formatDuration } from "../lib/format";
import type { MetricLabelMap } from "./MetricsPanel";

type MetricsChartsProps = {
  track: Track;
  availableMetrics: MetricKey[];
  metricLabels: MetricLabelMap;
  emptyText: string;
  onHoverPoint: (point: MapHoverPoint | null) => void;
};

type ChartPoint = TrackPoint & {
  pointIndex: number;
  distanceKm: number;
};

export default function MetricsCharts({ track, availableMetrics, metricLabels, emptyText, onHoverPoint }: MetricsChartsProps) {
  const metricOrder = availableMetrics;
  const lastHoverKeyRef = useRef<string | null>(null);
  const pendingHoverRef = useRef<MapHoverPoint | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const chartData: ChartPoint[] = useMemo(
    () =>
      downsampleMetricPoints(track.points, metricOrder).map((point) => ({
        ...point,
        distanceKm: Number((point.distance / 1000).toFixed(3)),
        speed: point.speed ? point.speed * 3.6 : undefined
      })),
    [metricOrder, track.points]
  );

  function handleMouseMove(state: unknown) {
    const chartState = state as { activeLabel?: unknown; activePayload?: Array<{ payload?: ChartPoint }> };
    const payload = chartState.activePayload?.[0]?.payload;
    const chartPoint = payload ?? closestChartPoint(chartData, chartState.activeLabel);
    if (chartPoint) {
      updateHoverPoint(track, chartPoint, lastHoverKeyRef, pendingHoverRef, hoverFrameRef, onHoverPoint);
    }
  }

  function clearHoverPoint() {
    lastHoverKeyRef.current = null;
    pendingHoverRef.current = null;
    if (hoverFrameRef.current !== null) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = null;
    }
    onHoverPoint(null);
  }

  return (
    <div className="stacked-chart-grid" onMouseLeave={clearHoverPoint}>
      {metricOrder.length ? (
        metricOrder.map((key) => (
          <div className="chart-block compact-chart" key={key}>
            <h3>{metricLabels[key].label}</h3>
            <div className="chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ left: 4, right: 14, top: 4, bottom: 8 }}
                syncId="track-metrics"
                onMouseMove={handleMouseMove}
              >
              <CartesianGrid vertical={false} stroke="#d7dedb" />
                <XAxis
                  dataKey="distanceKm"
                  tickFormatter={(value) => `${value}km`}
                  minTickGap={28}
                  hide={key !== metricOrder.at(-1)}
                />
                <YAxis width={46} tickFormatter={(value) => formatAxis(value, key)} />
                <Tooltip
                  cursor={{ stroke: "#101820", strokeWidth: 1.5 }}
                  content={(props) => (
                    <MetricTooltip
                      active={props.active}
                      payload={props.payload as unknown as ReadonlyArray<{ value?: unknown; payload?: ChartPoint }> | undefined}
                      metricKey={key}
                      metricLabels={metricLabels}
                      track={track}
                    />
                  )}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={key}
                  name={key}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
                  stroke={metricLabels[key].color}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                />
            </LineChart>
          </ResponsiveContainer>
            </div>
        </div>
        ))
      ) : (
        <div className="empty-chart">{emptyText}</div>
      )}
    </div>
  );
}

function formatTooltip(value: unknown, key: MetricKey, metricLabels: MetricLabelMap) {
  const meta = metricLabels[key];
  const number = typeof value === "number" ? value : Number(value);
  return [`${number.toFixed(key === "speed" ? 1 : 0)} ${meta.unit}`, meta.label];
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: ChartPoint }>;
  metricKey: MetricKey;
  metricLabels: MetricLabelMap;
  track: Track;
};

function MetricTooltip({ active, payload, metricKey, metricLabels, track }: TooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;

  if (!active || !payload?.length) {
    return null;
  }

  if (!point) {
    return null;
  }

  const elapsedSeconds = elapsedFromStart(track.points, point.pointIndex);
  const movingSeconds = movingFromStart(track.points, point.pointIndex);
  const [value, label] = formatTooltip(payload[0].value, metricKey, metricLabels);

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>{value}</span>
      <span>{formatDistance(point.distance)}</span>
      <span>Elapsed {formatDuration(elapsedSeconds)}</span>
      <span>Moving {formatDuration(movingSeconds)}</span>
    </div>
  );
}

function updateHoverPoint(
  track: Track,
  chartPoint: ChartPoint,
  lastHoverKeyRef: { current: string | null },
  pendingHoverRef: { current: MapHoverPoint | null },
  hoverFrameRef: { current: number | null },
  onHoverPoint: (point: MapHoverPoint | null) => void
) {
  const key = `${track.id}:${chartPoint.pointIndex}`;
  if (lastHoverKeyRef.current === key) {
    return;
  }

  lastHoverKeyRef.current = key;
  pendingHoverRef.current = toMapHoverPoint(track, chartPoint);
  if (hoverFrameRef.current !== null) {
    return;
  }

  hoverFrameRef.current = window.requestAnimationFrame(() => {
    hoverFrameRef.current = null;
    onHoverPoint(pendingHoverRef.current);
  });
}

function toMapHoverPoint(track: Track, chartPoint: ChartPoint): MapHoverPoint | null {
  const point = track.points[chartPoint.pointIndex];
  return point ? { point, trackId: track.id, trackName: track.name, color: track.color } : null;
}

function closestChartPoint(points: ChartPoint[], label: unknown) {
  const distanceKm = typeof label === "number" ? label : Number(label);
  if (!Number.isFinite(distanceKm)) {
    return undefined;
  }

  let closest = points[0];
  let closestDistance = Math.abs(points[0].distanceKm - distanceKm);
  for (const point of points) {
    const distance = Math.abs(point.distanceKm - distanceKm);
    if (distance < closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  }

  return closest;
}

function elapsedFromStart(points: TrackPoint[], pointIndex: number) {
  const start = points.find((point) => point.time)?.time;
  const current = points[pointIndex]?.time;
  return start && current ? Math.max(0, (current.getTime() - start.getTime()) / 1000) : undefined;
}

function movingFromStart(points: TrackPoint[], pointIndex: number) {
  let movingSeconds = 0;

  for (let index = 1; index <= pointIndex; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (!previous?.time || !point?.time) {
      continue;
    }

    const deltaSeconds = (point.time.getTime() - previous.time.getTime()) / 1000;
    if (deltaSeconds > 0 && (point.speed ?? 0) >= 0.6) {
      movingSeconds += deltaSeconds;
    }
  }

  return movingSeconds || undefined;
}

function formatAxis(value: unknown, key: MetricKey) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  return key === "speed" ? number.toFixed(0) : Math.round(number).toString();
}
