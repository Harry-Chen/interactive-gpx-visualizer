import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { MetricKey, Track } from "../types";
import type { MetricLabelMap } from "./MetricsPanel";

type MetricsChartsProps = {
  track: Track;
  availableMetrics: MetricKey[];
  metricLabels: MetricLabelMap;
};

export default function MetricsCharts({ track, availableMetrics, metricLabels }: MetricsChartsProps) {
  const chartData = track.points.map((point) => ({
    distanceKm: Number((point.distance / 1000).toFixed(3)),
    ele: point.ele,
    speed: point.speed ? point.speed * 3.6 : undefined,
    heartRate: point.heartRate,
    cadence: point.cadence,
    power: point.power,
    temperature: point.temperature
  }));

  return (
    <div className="chart-grid">
      {availableMetrics.includes("ele") ? (
        <div className="chart-block">
          <h3>海拔剖面</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -18, right: 10, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="elevationFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2c7a7b" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#2c7a7b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#d7dedb" />
              <XAxis dataKey="distanceKm" tickFormatter={(value) => `${value}km`} minTickGap={28} />
              <YAxis unit="m" />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(0)} m`, "海拔"]} />
              <Area type="monotone" dataKey="ele" stroke="#2c7a7b" fill="url(#elevationFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="chart-block">
        <h3>指标曲线</h3>
        {availableMetrics.filter((key) => key !== "ele").length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -18, right: 14, top: 6, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#d7dedb" />
              <XAxis dataKey="distanceKm" tickFormatter={(value) => `${value}km`} minTickGap={28} />
              <YAxis />
              <Tooltip formatter={(value, name) => formatTooltip(value, String(name) as MetricKey, metricLabels)} />
              {availableMetrics
                .filter((key) => key !== "ele")
                .map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    dot={false}
                    stroke={metricLabels[key].color}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">这条轨迹没有额外传感器数据</div>
        )}
      </div>
    </div>
  );
}

function formatTooltip(value: unknown, key: MetricKey, metricLabels: MetricLabelMap) {
  const meta = metricLabels[key];
  const number = typeof value === "number" ? value : Number(value);
  return [`${number.toFixed(key === "speed" ? 1 : 0)} ${meta.unit}`, meta.label];
}
