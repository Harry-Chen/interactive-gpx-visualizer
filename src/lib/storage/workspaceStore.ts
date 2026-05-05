import type { Track, TrackPoint, TrackStats } from "../../types";

const DATABASE_NAME = "interactive-gpx-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "workspace";
const TRACKS_KEY = "tracks";

type SerializableTrackPoint = Omit<TrackPoint, "time"> & {
  time?: string;
};

type SerializableTrackStats = Omit<TrackStats, "startTime" | "endTime"> & {
  startTime?: string;
  endTime?: string;
};

type SerializableTrack = Omit<Track, "points" | "displayPoints" | "stats" | "geohashes"> & {
  points: SerializableTrackPoint[];
  displayPointIndexes: number[];
  stats: SerializableTrackStats;
  geohashes: string[];
};

export async function readStoredTracks(): Promise<Track[]> {
  try {
    const database = await openDatabase();
    if (!database) {
      return [];
    }

    const stored = await readValue<SerializableTrack[]>(database, TRACKS_KEY);
    return Array.isArray(stored) ? stored.map(deserializeTrack) : [];
  } catch {
    return [];
  }
}

export async function writeStoredTracks(tracks: Track[]) {
  try {
    const database = await openDatabase();
    if (!database) {
      return;
    }

    await writeValue(database, TRACKS_KEY, tracks.map(serializeTrack));
  } catch {
    // Workspace persistence is best-effort and should never block map interaction.
  }
}

export async function clearStoredTracks() {
  try {
    const database = await openDatabase();
    if (!database) {
      return;
    }

    await deleteValue(database, TRACKS_KEY);
  } catch {
    // Clearing persistence is also best-effort.
  }
}

function serializeTrack(track: Track): SerializableTrack {
  const pointIndexes = new Map(track.points.map((point, index) => [point, index]));

  return {
    ...track,
    points: track.points.map(serializePoint),
    displayPointIndexes: track.displayPoints.map((point) => pointIndexes.get(point)).filter(isNumber),
    stats: serializeStats(track.stats),
    geohashes: [...track.geohashes]
  };
}

function deserializeTrack(track: SerializableTrack): Track {
  const points = track.points.map(deserializePoint);

  return {
    ...track,
    points,
    displayPoints: track.displayPointIndexes.map((index) => points[index]).filter(Boolean),
    stats: deserializeStats(track.stats),
    geohashes: new Set(track.geohashes)
  };
}

function serializePoint(point: TrackPoint): SerializableTrackPoint {
  return {
    ...point,
    time: point.time?.toISOString()
  };
}

function deserializePoint(point: SerializableTrackPoint): TrackPoint {
  return {
    ...point,
    time: point.time ? new Date(point.time) : undefined
  };
}

function serializeStats(stats: TrackStats): SerializableTrackStats {
  return {
    ...stats,
    startTime: stats.startTime?.toISOString(),
    endTime: stats.endTime?.toISOString()
  };
}

function deserializeStats(stats: SerializableTrackStats): TrackStats {
  return {
    ...stats,
    startTime: stats.startTime ? new Date(stats.startTime) : undefined,
    endTime: stats.endTime ? new Date(stats.endTime) : undefined
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function readValue<T>(database: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const store = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => resolve(undefined);
  });
}

function writeValue(database: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

function deleteValue(database: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number";
}
