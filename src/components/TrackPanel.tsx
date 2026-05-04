import { Eye, EyeOff, Focus, Palette, Trash2, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Track } from "../types";
import { formatDistance, formatDuration } from "../lib/format";

type TrackPanelProps = {
  tracks: Track[];
  selectedTrackId?: string;
  importing: boolean;
  filterActive: boolean;
  matchedCount: number;
  errors: string[];
  onFiles: (files: File[]) => void;
  onSelect: (trackId: string) => void;
  onToggleVisible: (trackId: string) => void;
  onColorChange: (trackId: string, color: string) => void;
  onRemove: (trackId: string) => void;
  onFocus: (trackId: string) => void;
};

export default function TrackPanel({
  tracks,
  selectedTrackId,
  importing,
  filterActive,
  matchedCount,
  errors,
  onFiles,
  onSelect,
  onToggleVisible,
  onColorChange,
  onRemove,
  onFocus
}: TrackPanelProps) {
  const shownTracks = filterActive ? tracks.filter((track) => track.matched) : tracks;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) {
      onFiles(files);
      event.target.value = "";
    }
  }

  return (
    <aside className="track-panel">
      <label className="upload-target">
        <input type="file" accept=".gpx,.fit,application/gpx+xml" multiple onChange={handleFileChange} />
        <Upload aria-hidden="true" size={20} />
        <span>{importing ? "正在解析..." : "上传 GPX / FIT"}</span>
      </label>

      <div className="panel-summary">
        <div>
          <strong>{tracks.length}</strong>
          <span>Tracks</span>
        </div>
        <div>
          <strong>{filterActive ? matchedCount : tracks.length}</strong>
          <span>{filterActive ? "Matched" : "Visible Set"}</span>
        </div>
      </div>

      {errors.length ? (
        <div className="error-list">
          {errors.slice(0, 3).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="track-list">
        {shownTracks.length ? (
          shownTracks.map((track) => (
            <article
              className={`track-row ${track.id === selectedTrackId ? "selected" : ""}`}
              key={track.id}
              onClick={() => onSelect(track.id)}
            >
              <div className="track-row-top">
                <span className="track-color-dot" style={{ backgroundColor: track.color }} />
                <div className="track-copy">
                  <h2 title={track.name}>{track.name}</h2>
                  <p>
                    {track.kind.toUpperCase()} · {formatDistance(track.stats.distance)} · {formatDuration(track.stats.duration)}
                  </p>
                </div>
              </div>

              <div className="track-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" title={track.visible ? "隐藏轨迹" : "显示轨迹"} onClick={() => onToggleVisible(track.id)}>
                  {track.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <label title="切换颜色" className="color-input-label">
                  <Palette size={16} />
                  <input type="color" value={track.color} onChange={(event) => onColorChange(track.id, event.target.value)} />
                </label>
                <button type="button" title="缩放到轨迹" onClick={() => onFocus(track.id)}>
                  <Focus size={17} />
                </button>
                <button type="button" title="移除轨迹" onClick={() => onRemove(track.id)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">没有匹配的轨迹</div>
        )}
      </div>
    </aside>
  );
}
