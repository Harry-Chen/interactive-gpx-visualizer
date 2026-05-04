import { useCallback, useRef, useState } from "react";
import { Info } from "lucide-react";
import MapView from "./components/MapView";
import MetricsPanel from "./components/MetricsPanel";
import SelectionToolbar from "./components/SelectionToolbar";
import TrackPanel from "./components/TrackPanel";
import type { SortDirection, TrackSortKey } from "./components/TrackPanel";
import { boundsIntersect, routeIntersectsBounds } from "./lib/geo";
import { buildTrackGeohashes, filterCandidateTracks } from "./lib/geohash";
import { parseFiles } from "./lib/parsers";
import { simplifyTrackPoints } from "./lib/simplify";
import { DEFAULT_BASEMAP_ID, type BasemapId } from "./lib/basemaps";
import { filesFromDataTransfer, isSupportedFile } from "./lib/fileDrop";
import type { Language } from "./lib/i18n";
import { t } from "./lib/i18n";
import type { Bounds, ImportProgress, MapHoverPoint, ParsedTrack, Track } from "./types";

const DEFAULT_COLORS = ["#d94848", "#2c7a7b", "#b45309", "#345995", "#7c3aed", "#0f766e", "#c026d3", "#2563eb"];
const BUILD_LABEL = `${__APP_VERSION__} · ${formatBuildDate(__BUILD_DATE__)}`;
const REPOSITORY_URL = "https://github.com/Harry-Chen/interactive-gpx-visualizer";
const PUBLIC_SITE_URL = "https://gpx.harrychen.xyz";

type FocusRequest = {
  trackId: string;
  nonce: number;
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filterBounds, setFilterBounds] = useState<Bounds | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionResetToken, setSelectionResetToken] = useState(0);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>(DEFAULT_BASEMAP_ID);
  const [showDirectionArrows, setShowDirectionArrows] = useState(false);
  const hoverPointHandlerRef = useRef<(point: MapHoverPoint | null) => void>(() => {});
  const [dragActive, setDragActive] = useState(false);
  const [language, setLanguage] = useState<Language>("zh");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [metricsHeight, setMetricsHeight] = useState(380);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [checkedTrackIds, setCheckedTrackIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<TrackSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const selectedTrack = tracks.find((track) => track.selected);
  const matchedCount = tracks.filter((track) => track.matched).length;
  const sortedTracks = sortTracks(tracks, sortKey, sortDirection);
  const handleHoverPointReady = useCallback((handler: (point: MapHoverPoint | null) => void) => {
    hoverPointHandlerRef.current = handler;
  }, []);
  const handleHoverPoint = useCallback((point: MapHoverPoint | null) => {
    hoverPointHandlerRef.current(point);
  }, []);

  async function handleFiles(files: File[]) {
    const supportedFiles = files.filter(isSupportedFile);
    if (!supportedFiles.length) {
      setErrors([t(language, "noSupportedFiles")]);
      return;
    }

    setImporting(true);
    setImportProgress({ done: 0, total: supportedFiles.length });
    try {
      const result = await parseFiles(supportedFiles, language, setImportProgress);
      setErrors(result.errors);

      if (result.tracks.length) {
        setTracks((current) => {
          const currentHasSelection = current.some((track) => track.selected);
          const additions = result.tracks.map((track, index) =>
            hydrateTrack(track, current.length + index, !currentHasSelection && index === 0)
          );
          const next = [...current, ...additions];
          return applyFilter(next, filterBounds);
        });
        window.setTimeout(() => setFocusRequest({ trackId: "__all__", nonce: Date.now() }), 0);
      }
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = await filesFromDataTransfer(event.dataTransfer);
    await handleFiles(files);
  }

  function handleSelect(trackId: string) {
    setTracks((current) =>
      current.map((track) => ({
        ...track,
        selected: track.id === trackId
      }))
    );
  }

  function handleToggleVisible(trackId: string) {
    setTracks((current) =>
      current.map((track) => (track.id === trackId ? { ...track, visible: !track.visible } : track))
    );
  }

  function handleColorChange(trackId: string, color: string) {
    setTracks((current) => current.map((track) => (track.id === trackId ? { ...track, color } : track)));
  }

  function handleRemove(trackId: string) {
    setCheckedTrackIds((current) => withoutIds(current, new Set([trackId])));
    setTracks((current) => {
      const removedSelected = current.find((track) => track.id === trackId)?.selected;
      const next = current.filter((track) => track.id !== trackId);

      if (removedSelected && next.length) {
        return next.map((track, index) => ({ ...track, selected: index === 0 }));
      }

      return next;
    });
  }

  function handleCheck(trackId: string, checked: boolean) {
    setCheckedTrackIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(trackId);
      } else {
        next.delete(trackId);
      }
      return next;
    });
  }

  function handleCheckMany(trackIds: string[], checked: boolean) {
    setCheckedTrackIds((current) => {
      const next = new Set(current);
      for (const trackId of trackIds) {
        if (checked) {
          next.add(trackId);
        } else {
          next.delete(trackId);
        }
      }
      return next;
    });
  }

  function handleSetCheckedVisible(visible: boolean) {
    setTracks((current) =>
      current.map((track) => (checkedTrackIds.has(track.id) ? { ...track, visible } : track))
    );
  }

  function handleRemoveChecked() {
    setTracks((current) => {
      const next = current.filter((track) => !checkedTrackIds.has(track.id));
      const hasSelection = next.some((track) => track.selected);
      if (!hasSelection && next.length) {
        return next.map((track, index) => ({ ...track, selected: index === 0 }));
      }
      return next;
    });
    setCheckedTrackIds(new Set());
  }

  function handleClearAll() {
    setTracks([]);
    setCheckedTrackIds(new Set());
    setFilterBounds(null);
    handleHoverPoint(null);
  }

  function handleFocus(trackId: string) {
    handleSelect(trackId);
    setFocusRequest({ trackId, nonce: Date.now() });
  }

  function handleSelection(bounds: Bounds) {
    setFilterBounds(bounds);
    setSelectionMode(false);
    setSelectionResetToken((value) => value + 1);
    setTracks((current) => ensureSelection(applyFilter(current, bounds)));
  }

  function handleClearFilter() {
    setFilterBounds(null);
    setTracks((current) => current.map((track) => ({ ...track, matched: true })));
  }

  return (
    <main
      className={`app-shell ${dragActive ? "drag-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false);
        }
      }}
      onDrop={handleDrop}
    >
      <MapView
        tracks={tracks}
        filterBounds={filterBounds}
        selectionMode={selectionMode}
        selectionResetToken={selectionResetToken}
        focusRequest={focusRequest}
        basemapId={basemapId}
        showDirectionArrows={showDirectionArrows}
        onHoverPointReady={handleHoverPointReady}
        onSelection={handleSelection}
        onTrackSelect={handleSelect}
      />

      <div className="brand-bar">
        <div>
          <span>{t(language, "appSubtitle")}</span>
          <strong>{t(language, "appTitle")}</strong>
          <small>{BUILD_LABEL}</small>
        </div>
        <button
          type="button"
          aria-label={t(language, "about")}
          className="about-button"
          title={t(language, "about")}
          onClick={() => setAboutOpen(true)}
        >
          <Info size={18} />
        </button>
      </div>

      <SelectionToolbar
        selectionMode={selectionMode}
        filterBounds={filterBounds}
        matchedCount={matchedCount}
        basemapId={basemapId}
        showDirectionArrows={showDirectionArrows}
        language={language}
        onToggleSelectionMode={() => {
          setSelectionMode((value) => {
            const next = !value;
            if (!next) {
              setSelectionResetToken((token) => token + 1);
            }
            return next;
          });
        }}
        onClearFilter={handleClearFilter}
        onBasemapChange={setBasemapId}
        onDirectionArrowsChange={setShowDirectionArrows}
        onLanguageChange={setLanguage}
      />

      <TrackPanel
        tracks={sortedTracks}
        selectedTrackId={selectedTrack?.id}
        checkedTrackIds={checkedTrackIds}
        importing={importing}
        filterActive={Boolean(filterBounds)}
        matchedCount={matchedCount}
        errors={errors}
        language={language}
        importProgress={importProgress}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onFiles={handleFiles}
        onSelect={handleSelect}
        onCheck={handleCheck}
        onCheckMany={handleCheckMany}
        onClearChecked={() => setCheckedTrackIds(new Set())}
        onToggleVisible={handleToggleVisible}
        onSetCheckedVisible={handleSetCheckedVisible}
        onColorChange={handleColorChange}
        onRemove={handleRemove}
        onFocus={handleFocus}
        onRemoveChecked={handleRemoveChecked}
        onClearAll={handleClearAll}
        onSortChange={setSortKey}
        onSortDirectionChange={setSortDirection}
      />

      <MetricsPanel
        track={selectedTrack}
        language={language}
        height={metricsHeight}
        onHeightChange={setMetricsHeight}
        onHoverPoint={handleHoverPoint}
      />
      <div className="drop-overlay">
        <strong>{t(language, "dropTitle")}</strong>
        <span>{t(language, "dropBody")}</span>
      </div>

      {aboutOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAboutOpen(false)}>
          <section
            aria-modal="true"
            className="about-dialog"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2>{t(language, "aboutTitle")}</h2>
              <button type="button" onClick={() => setAboutOpen(false)}>
                {t(language, "close")}
              </button>
            </header>
            <dl className="about-meta">
              <div>
                <dt>{t(language, "version")}</dt>
                <dd>{__APP_VERSION__}</dd>
              </div>
              <div>
                <dt>{t(language, "buildDate")}</dt>
                <dd>{formatBuildDate(__BUILD_DATE__)}</dd>
              </div>
              <div>
                <dt>{t(language, "license")}</dt>
                <dd>MIT</dd>
              </div>
              <div>
                <dt>{t(language, "repository")}</dt>
                <dd>
                  <a href={REPOSITORY_URL} rel="noreferrer" target="_blank">
                    {REPOSITORY_URL}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t(language, "publicSite")}</dt>
                <dd>
                  <a href={PUBLIC_SITE_URL} rel="noreferrer" target="_blank">
                    {PUBLIC_SITE_URL}
                  </a>
                </dd>
              </div>
            </dl>
            <h3>{t(language, "dependencies")}</h3>
            <div className="dependency-table">
              {__DEPENDENCY_LICENSES__.map((dependency) => (
                <div key={dependency.name}>
                  <span>{dependency.name}</span>
                  <span>{dependency.version}</span>
                  <span>{dependency.license}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function hydrateTrack(track: ParsedTrack, index: number, selected: boolean): Track {
  return {
    ...track,
    id: `${track.kind}-${index}-${crypto.randomUUID()}`,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    visible: true,
    selected,
    matched: true,
    displayPoints: simplifyTrackPoints(track.points),
    geohashes: buildTrackGeohashes(track.points)
  };
}

function applyFilter(tracks: Track[], bounds: Bounds | null) {
  if (!bounds) {
    return tracks.map((track) => ({ ...track, matched: true }));
  }

  const candidates = new Set(filterCandidateTracks(tracks.filter((track) => boundsIntersect(track.bounds, bounds)), bounds).map((track) => track.id));

  return tracks.map((track) => ({
    ...track,
    matched: candidates.has(track.id) && routeIntersectsBounds(track.points, bounds)
  }));
}

function ensureSelection(tracks: Track[]) {
  const selected = tracks.find((track) => track.selected);

  if (selected?.matched) {
    return tracks;
  }

  const firstMatched = tracks.find((track) => track.matched);
  if (!firstMatched) {
    return tracks;
  }

  return tracks.map((track) => ({
    ...track,
    selected: track.id === firstMatched.id
  }));
}

function sortTracks(tracks: Track[], sortKey: TrackSortKey, direction: SortDirection) {
  const sign = direction === "asc" ? 1 : -1;

  return [...tracks].sort((a, b) => {
    const result = compareTracks(a, b, sortKey);
    return result * sign || a.name.localeCompare(b.name);
  });
}

function formatBuildDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 16).replace("T", " ");
}

function compareTracks(a: Track, b: Track, sortKey: TrackSortKey) {
  if (sortKey === "distance") {
    return a.stats.distance - b.stats.distance;
  }

  if (sortKey === "movingTime") {
    return (a.stats.movingTime ?? a.stats.duration ?? 0) - (b.stats.movingTime ?? b.stats.duration ?? 0);
  }

  if (sortKey === "date") {
    return (a.stats.startTime?.getTime() ?? 0) - (b.stats.startTime?.getTime() ?? 0);
  }

  return a.name.localeCompare(b.name);
}

function withoutIds(ids: Set<string>, removeIds: Set<string>) {
  const next = new Set(ids);
  for (const id of removeIds) {
    next.delete(id);
  }
  return next;
}
