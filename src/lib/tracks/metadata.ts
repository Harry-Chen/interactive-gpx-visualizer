import type { Track } from "../../types";
import { formatDateTime, formatDistance, formatDuration } from "../ui/format";

export function trackType(track: Pick<Track, "kind">) {
  return track.kind.toUpperCase();
}

export function trackDate(track: Pick<Track, "stats">) {
  return formatDateTime(track.stats.startTime);
}

export function trackDuration(track: Pick<Track, "stats">) {
  return formatDuration(track.stats.movingTime ?? track.stats.duration);
}

export function trackSummary(track: Pick<Track, "kind" | "stats">) {
  return `${trackType(track)} · ${formatDistance(track.stats.distance)} · ${trackDuration(track)}`;
}
