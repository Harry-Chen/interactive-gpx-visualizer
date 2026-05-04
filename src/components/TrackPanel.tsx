import { Eye, EyeOff, Focus, Palette, Trash2, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import type { ImportProgress, Track } from "../types";
import type { Language } from "../lib/i18n";
import { t } from "../lib/i18n";
import { trackDate, trackSummary } from "../lib/trackMetadata";

export type TrackSortKey = "name" | "date" | "distance" | "movingTime";
export type SortDirection = "asc" | "desc";

type TrackPanelProps = {
  tracks: Track[];
  selectedTrackId?: string;
  checkedTrackIds: Set<string>;
  importing: boolean;
  importProgress: ImportProgress | null;
  filterActive: boolean;
  matchedCount: number;
  errors: string[];
  language: Language;
  sortKey: TrackSortKey;
  sortDirection: SortDirection;
  onFiles: (files: File[]) => void;
  onSelect: (trackId: string) => void;
  onCheck: (trackId: string, checked: boolean) => void;
  onCheckMany: (trackIds: string[], checked: boolean) => void;
  onClearChecked: () => void;
  onToggleVisible: (trackId: string) => void;
  onSetCheckedVisible: (visible: boolean) => void;
  onColorChange: (trackId: string, color: string) => void;
  onRemove: (trackId: string) => void;
  onFocus: (trackId: string) => void;
  onRemoveChecked: () => void;
  onClearAll: () => void;
  onSortChange: (sortKey: TrackSortKey) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
};

export default function TrackPanel({
  tracks,
  selectedTrackId,
  checkedTrackIds,
  importing,
  importProgress,
  filterActive,
  matchedCount,
  errors,
  language,
  sortKey,
  sortDirection,
  onFiles,
  onSelect,
  onCheck,
  onCheckMany,
  onClearChecked,
  onToggleVisible,
  onSetCheckedVisible,
  onColorChange,
  onRemove,
  onFocus,
  onRemoveChecked,
  onClearAll,
  onSortChange,
  onSortDirectionChange
}: TrackPanelProps) {
  const shownTracks = filterActive ? tracks.filter((track) => track.matched) : tracks;
  const shownTrackIds = shownTracks.map((track) => track.id);
  const selectedShownCount = shownTrackIds.filter((trackId) => checkedTrackIds.has(trackId)).length;
  const allShownChecked = shownTracks.length > 0 && selectedShownCount === shownTracks.length;
  const hasCheckedTracks = checkedTrackIds.size > 0;

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
        <input type="file" accept=".gpx,.fit,.gpx.gz,.fit.gz,application/gpx+xml" multiple onChange={handleFileChange} />
        <Upload aria-hidden="true" size={20} />
        <span>
          {importing && importProgress
            ? t(language, "importingProgress", { done: importProgress.done, total: importProgress.total })
            : importing
              ? t(language, "importing")
              : t(language, "upload")}
        </span>
      </label>

      <div className="panel-summary">
        <div>
          <strong>{tracks.length}</strong>
          <span>{t(language, "tracks")}</span>
        </div>
        <div>
          <strong>{filterActive ? matchedCount : tracks.length}</strong>
          <span>{filterActive ? t(language, "matched") : t(language, "visibleSet")}</span>
        </div>
      </div>

      <div className="track-bulk-toolbar">
        <span className="track-bulk-status">{t(language, "selectedCount", { count: checkedTrackIds.size })}</span>
        <div className="track-bulk-actions">
          <button type="button" disabled={!shownTracks.length || allShownChecked} onClick={() => onCheckMany(shownTrackIds, true)}>
            {t(language, "selectAll")}
          </button>
          <button type="button" disabled={!hasCheckedTracks} onClick={onClearChecked}>
            {t(language, "clearSelection")}
          </button>
          <button type="button" disabled={!hasCheckedTracks} onClick={() => onSetCheckedVisible(true)}>
            {t(language, "showSelected")}
          </button>
          <button type="button" disabled={!hasCheckedTracks} onClick={() => onSetCheckedVisible(false)}>
            {t(language, "hideSelected")}
          </button>
          <button type="button" disabled={!hasCheckedTracks} onClick={onRemoveChecked}>
            {t(language, "deleteSelected")}
          </button>
          <button type="button" disabled={!tracks.length} onClick={onClearAll}>
            {t(language, "clearAll")}
          </button>
        </div>
      </div>

      <div className="track-sort-toolbar">
        <label>
          <span>{t(language, "sortBy")}</span>
          <select value={sortKey} onChange={(event) => onSortChange(event.target.value as TrackSortKey)}>
            <option value="date">{t(language, "sortDate")}</option>
            <option value="distance">{t(language, "sortDistance")}</option>
            <option value="movingTime">{t(language, "sortDuration")}</option>
            <option value="name">{t(language, "sortName")}</option>
          </select>
        </label>
        <select value={sortDirection} onChange={(event) => onSortDirectionChange(event.target.value as SortDirection)}>
          <option value="desc">{t(language, "sortDesc")}</option>
          <option value="asc">{t(language, "sortAsc")}</option>
        </select>
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
                <input
                  type="checkbox"
                  className="track-select-checkbox"
                  checked={checkedTrackIds.has(track.id)}
                  onChange={(event) => onCheck(track.id, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="track-color-dot" style={{ backgroundColor: track.color }} />
                <div className="track-copy">
                  <h2 title={track.name}>{track.name}</h2>
                  <p>{trackDate(track)}</p>
                  <p>{trackSummary(track)}</p>
                </div>
              </div>

              <div className="track-actions" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  title={track.visible ? t(language, "hideTrack") : t(language, "showTrack")}
                  onClick={() => onToggleVisible(track.id)}
                >
                  {track.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <label title={t(language, "colorTrack")} className="color-input-label">
                  <Palette size={16} />
                  <input type="color" value={track.color} onChange={(event) => onColorChange(track.id, event.target.value)} />
                </label>
                <button type="button" title={t(language, "focusTrack")} onClick={() => onFocus(track.id)}>
                  <Focus size={17} />
                </button>
                <button type="button" title={t(language, "removeTrack")} onClick={() => onRemove(track.id)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{t(language, "noMatchedTracks")}</div>
        )}
      </div>
    </aside>
  );
}
