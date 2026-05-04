import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { MetricKey, Track, TrackPoint } from "../types";
import { downsampleMetricPoints } from "../lib/simplify";
import type { MetricLabelMap } from "./MetricsPanel";

type MetricsChartsProps = {
  track: Track;
  availableMetrics: MetricKey[];
  metricLabels: MetricLabelMap;
  onHoverPoint: (point: TrackPoint | null) => void;
};

type ChartPoint = TrackPoint & {
  pointIndex: number;
  distanceKm: number;
};

export default function MetricsCharts({ track, availableMetrics, metricLabels, onHoverPoint }: MetricsChartsProps) {
  const metricOrder = availableMetrics;
  const chartData: ChartPoint[] = downsampleMetricPoints(track.points, metricOrder).map((point) => ({
    ...point,
    distanceKm: Number((point.distance / 1000).toFixed(3)),
    speed: point.speed ? point.speed * 3.6 : undefined,
  }));

  function handleMouseMove(state: unknown) {
    const chartState = state as { activePayload?: Array<{ payload?: ChartPoint }> };
    const payload = chartState.activePayload?.[0]?.payload;
    if (payload) {
      onHoverPoint(track.points[payload.pointIndex] ?? null);
    }
  }

  return (
    <div className="stacked-chart-grid" onMouseLeave={() => onHoverPoint(null)}>
      {metricOrder.length ? (
        metricOrder.map((key) => (
          <div className="chart-block compact-chart" key={key}>
            <h3>{metricLabels[key].label}</h3>
          <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ left: -18, right: 14, top: 4, bottom: key === metricOrder.at(-1) ? 0 : -10 }}
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
                  formatter={(value) => formatTooltip(value, key, metricLabels)}
                  labelFormatter={(value) => `${Number(value).toFixed(2)} km`}
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
        ))
      ) : (
        <div className="empty-chart">这条轨迹没有可绘制的指标数据</div>
      )}
    </div>
  );
}

function formatTooltip(value: unknown, key: MetricKey, metricLabels: MetricLabelMap) {
  const meta = metricLabels[key];
  const number = typeof value === "number" ? value : Number(value);
  return [`${number.toFixed(key === "speed" ? 1 : 0)} ${meta.unit}`, meta.label];
}

function formatAxis(value: unknown, key: MetricKey) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  return key === "speed" ? number.toFixed(0) : Math.round(number).toString();
}
