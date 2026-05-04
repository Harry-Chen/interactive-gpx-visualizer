import { lazy, Suspense, useRef } from "react";
import type { MapHoverPoint, MetricKey, Track } from "../types";
import { formatDistance, formatDuration, formatNumber, formatSpeed } from "../lib/format";
import { numbers } from "../lib/stats";
import type { Language } from "../lib/i18n";
import { metricLabelsByLanguage, t } from "../lib/i18n";
import { trackDate, trackType } from "../lib/trackMetadata";

type MetricsPanelProps = {
  track?: Track;
  language: Language;
  height: number;
  onHeightChange: (height: number) => void;
  onHoverPoint: (point: MapHoverPoint | null) => void;
};

const MetricsCharts = lazy(() => import("./MetricsCharts"));

export default function MetricsPanel({ track, language, height, onHeightChange, onHoverPoint }: MetricsPanelProps) {
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null);
  const metricLabels = metricLabelsByLanguage[language];

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    resizeStartRef.current = { y: event.clientY, height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resize(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resizeStartRef.current;
    if (!start) {
      return;
    }

    onHeightChange(Math.max(260, Math.min(680, start.height + start.y - event.clientY)));
  }

  function stopResize() {
    resizeStartRef.current = null;
  }

  if (!track) {
    return (
      <section className="metrics-panel idle">
        <div>
          <h2>{t(language, "uploadPromptTitle")}</h2>
          <p>{t(language, "uploadPromptBody")}</p>
        </div>
      </section>
    );
  }

  const availableMetrics = (Object.keys(metricLabels) as MetricKey[]).filter((key) =>
    numbers(track.points.map((point) => point[key])).length
  );

  return (
    <section className="metrics-panel" style={{ height }}>
      <button
        type="button"
        className="metrics-resize-handle"
        aria-label="Resize metrics panel"
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
      />
      <div className="metrics-heading">
        <div>
          <span className="eyebrow">{trackType(track)}</span>
          <h2>{track.name}</h2>
        </div>
        <dl className="track-metadata-grid">
          <Meta label={t(language, "type")} value={trackType(track)} />
          <Meta label={t(language, "dateTime")} value={trackDate(track)} />
          <Meta label={t(language, "file")} value={track.fileName} />
        </dl>
        <dl className="stats-grid">
          <Stat label={t(language, "distance")} value={formatDistance(track.stats.distance)} />
          <Stat label={t(language, "duration")} value={formatDuration(track.stats.duration)} />
          <Stat label={t(language, "elevationGain")} value={formatNumber(track.stats.elevationGain, " m")} />
          <Stat label={t(language, "avgSpeed")} value={formatSpeed(track.stats.avgSpeed)} />
          <Stat label={t(language, "avgHeartRate")} value={formatNumber(track.stats.avgHeartRate, " bpm")} />
          <Stat label={t(language, "avgPower")} value={formatNumber(track.stats.avgPower, " W")} />
        </dl>
      </div>

      <Suspense fallback={<div className="chart-grid loading-chart">{t(language, "loadingCharts")}</div>}>
        <MetricsCharts
          track={track}
          availableMetrics={availableMetrics}
          metricLabels={metricLabels}
          emptyText={t(language, "emptyMetrics")}
          onHoverPoint={onHoverPoint}
        />
      </Suspense>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
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

export type MetricLabelMap = Record<MetricKey, { label: string; unit: string; color: string }>;
