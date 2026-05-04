import { lazy, Suspense } from "react";
import type { MetricKey, Track } from "../types";
import { formatDistance, formatDuration, formatNumber, formatSpeed } from "../lib/format";
import { numbers } from "../lib/stats";

type MetricsPanelProps = {
  track?: Track;
};

const metricLabels: Record<MetricKey, { label: string; unit: string; color: string }> = {
  ele: { label: "海拔", unit: "m", color: "#2c7a7b" },
  speed: { label: "速度", unit: "km/h", color: "#c2410c" },
  heartRate: { label: "心率", unit: "bpm", color: "#be123c" },
  cadence: { label: "踏频", unit: "rpm", color: "#7c3aed" },
  power: { label: "功率", unit: "W", color: "#b45309" },
  temperature: { label: "温度", unit: "C", color: "#0f766e" }
};

const MetricsCharts = lazy(() => import("./MetricsCharts"));

export default function MetricsPanel({ track }: MetricsPanelProps) {
  if (!track) {
    return (
      <section className="metrics-panel idle">
        <div>
          <h2>上传并选择一条轨迹</h2>
          <p>轨迹的爬升、时间、速度和 FIT/GPX 扩展数据会在这里展开。</p>
        </div>
      </section>
    );
  }

  const availableMetrics = (Object.keys(metricLabels) as MetricKey[]).filter((key) =>
    numbers(track.points.map((point) => point[key])).length
  );

  return (
    <section className="metrics-panel">
      <div className="metrics-heading">
        <div>
          <span className="eyebrow">{track.kind.toUpperCase()}</span>
          <h2>{track.name}</h2>
        </div>
        <dl className="stats-grid">
          <Stat label="距离" value={formatDistance(track.stats.distance)} />
          <Stat label="用时" value={formatDuration(track.stats.duration)} />
          <Stat label="爬升" value={formatNumber(track.stats.elevationGain, " m")} />
          <Stat label="均速" value={formatSpeed(track.stats.avgSpeed)} />
          <Stat label="平均心率" value={formatNumber(track.stats.avgHeartRate, " bpm")} />
          <Stat label="平均功率" value={formatNumber(track.stats.avgPower, " W")} />
        </dl>
      </div>

      <Suspense fallback={<div className="chart-grid loading-chart">正在加载图表...</div>}>
        <MetricsCharts track={track} availableMetrics={availableMetrics} metricLabels={metricLabels} />
      </Suspense>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export type MetricLabelMap = typeof metricLabels;
