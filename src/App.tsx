import { useState } from "react";
import MapView from "./components/MapView";
import MetricsPanel from "./components/MetricsPanel";
import SelectionToolbar from "./components/SelectionToolbar";
import TrackPanel from "./components/TrackPanel";
import { boundsIntersect, routeIntersectsBounds } from "./lib/geo";
import { buildTrackGeohashes, filterCandidateTracks } from "./lib/geohash";
import { parseFiles } from "./lib/parsers";
import type { Bounds, ParsedTrack, Track } from "./types";

const DEFAULT_COLORS = ["#d94848", "#2c7a7b", "#b45309", "#345995", "#7c3aed", "#0f766e", "#c026d3", "#2563eb"];

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

  const selectedTrack = tracks.find((track) => track.selected);
  const matchedCount = tracks.filter((track) => track.matched).length;

  async function handleFiles(files: File[]) {
    setImporting(true);
    try {
      const result = await parseFiles(files);
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
      }
    } finally {
      setImporting(false);
    }
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
    setTracks((current) => {
      const removedSelected = current.find((track) => track.id === trackId)?.selected;
      const next = current.filter((track) => track.id !== trackId);

      if (removedSelected && next.length) {
        return next.map((track, index) => ({ ...track, selected: index === 0 }));
      }

      return next;
    });
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
    <main className="app-shell">
      <MapView
        tracks={tracks}
        filterBounds={filterBounds}
        selectionMode={selectionMode}
        selectionResetToken={selectionResetToken}
        focusRequest={focusRequest}
        onSelection={handleSelection}
        onTrackSelect={handleSelect}
      />

      <div className="brand-bar">
        <div>
          <span>Earth Routes</span>
          <strong>GPX / FIT Visualizer</strong>
        </div>
      </div>

      <SelectionToolbar
        selectionMode={selectionMode}
        filterBounds={filterBounds}
        matchedCount={matchedCount}
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
      />

      <TrackPanel
        tracks={tracks}
        selectedTrackId={selectedTrack?.id}
        importing={importing}
        filterActive={Boolean(filterBounds)}
        matchedCount={matchedCount}
        errors={errors}
        onFiles={handleFiles}
        onSelect={handleSelect}
        onToggleVisible={handleToggleVisible}
        onColorChange={handleColorChange}
        onRemove={handleRemove}
        onFocus={handleFocus}
      />

      <MetricsPanel track={selectedTrack} />
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
