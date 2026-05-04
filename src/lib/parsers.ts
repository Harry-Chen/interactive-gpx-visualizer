import { XMLParser } from "fast-xml-parser";
import type { FileKind, ParsedTrack, TrackPoint, UploadResult } from "../types";
import { calculateBounds } from "./geo";
import { calculateTrackStats, enrichPoints } from "./stats";

type GpxDocument = {
  gpx?: {
    trk?: GpxTrack | GpxTrack[];
    rte?: GpxRoute | GpxRoute[];
    wpt?: GpxPoint | GpxPoint[];
    metadata?: { name?: string };
  };
};

type GpxTrack = {
  name?: string;
  trkseg?: GpxSegment | GpxSegment[];
};

type GpxRoute = {
  name?: string;
  rtept?: GpxPoint | GpxPoint[];
};

type GpxSegment = {
  trkpt?: GpxPoint | GpxPoint[];
};

type GpxPoint = {
  lat?: number | string;
  lon?: number | string;
  ele?: number | string;
  time?: string;
  extensions?: unknown;
};

type FitRecord = {
  positionLat?: number;
  positionLong?: number;
  timestamp?: Date | number | string;
  altitude?: number;
  enhancedAltitude?: number;
  distance?: number;
  speed?: number;
  enhancedSpeed?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
};

type FitMessages = {
  recordMesgs?: FitRecord[];
  sessionMesgs?: Array<{ sport?: string; subSport?: string }>;
  activityMesgs?: Array<{ timestamp?: Date | number | string }>;
  fileIdMesgs?: Array<{ timeCreated?: Date | number | string }>;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "value",
  parseAttributeValue: true,
  parseTagValue: true
});

export async function parseFiles(files: File[]): Promise<UploadResult> {
  const tracks: ParsedTrack[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const parsed = await parseFile(file);
      tracks.push(...parsed);
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : "无法解析文件"}`);
    }
  }

  return { tracks, errors };
}

async function parseFile(file: File): Promise<ParsedTrack[]> {
  const kind = detectKind(file);

  if (kind === "gpx") {
    return parseGpx(file.name, await file.text());
  }

  if (kind === "fit") {
    return parseFit(file.name, await file.arrayBuffer());
  }

  throw new Error("仅支持 .gpx 和 .fit 文件");
}

function parseGpx(fileName: string, source: string): ParsedTrack[] {
  const document = xmlParser.parse(source) as GpxDocument;
  const gpx = document.gpx;

  if (!gpx) {
    throw new Error("不是有效的 GPX 文件");
  }

  const tracks: ParsedTrack[] = [];
  const gpxTracks = toArray(gpx.trk);

  gpxTracks.forEach((track, trackIndex) => {
    const segments = toArray(track.trkseg);
    const rawPoints = segments.flatMap((segment) => toArray(segment.trkpt).map(gpxPointToTrackPoint)).filter(isPoint);
    if (rawPoints.length >= 2) {
      tracks.push(createParsedTrack(fileName, "gpx", track.name || gpx.metadata?.name || `GPX Track ${trackIndex + 1}`, rawPoints));
    }
  });

  const routes = toArray(gpx.rte);
  routes.forEach((route, routeIndex) => {
    const rawPoints = toArray(route.rtept).map(gpxPointToTrackPoint).filter(isPoint);
    if (rawPoints.length >= 2) {
      tracks.push(createParsedTrack(fileName, "gpx", route.name || `GPX Route ${routeIndex + 1}`, rawPoints));
    }
  });

  if (!tracks.length) {
    const waypoints = toArray(gpx.wpt).map(gpxPointToTrackPoint).filter(isPoint);
    if (waypoints.length >= 2) {
      tracks.push(createParsedTrack(fileName, "gpx", gpx.metadata?.name || fileName, waypoints));
    }
  }

  if (!tracks.length) {
    throw new Error("没有找到可绘制的路线点");
  }

  return tracks;
}

async function parseFit(fileName: string, source: ArrayBuffer): Promise<ParsedTrack[]> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const stream = Stream.fromArrayBuffer(source);
  const decoder = new Decoder(stream);

  if (!decoder.isFIT()) {
    throw new Error("不是有效的 FIT 文件");
  }

  const { messages, errors } = decoder.read({
    applyScaleAndOffset: true,
    expandSubFields: true,
    expandComponents: true,
    convertTypesToStrings: true,
    convertDateTimesToDates: true,
    includeUnknownData: false,
    mergeHeartRates: true
  }) as { messages: FitMessages; errors: unknown[] };

  if (errors.length) {
    throw new Error("FIT 解码失败");
  }

  const rawPoints = (messages.recordMesgs ?? []).map(fitRecordToTrackPoint).filter(isPoint);
  if (rawPoints.length < 2) {
    throw new Error("没有找到可绘制的 GPS 记录");
  }

  const name = fitTrackName(messages, fileName);
  return [createParsedTrack(fileName, "fit", name, rawPoints)];
}

function createParsedTrack(
  fileName: string,
  kind: FileKind,
  name: string,
  rawPoints: Array<Omit<TrackPoint, "distance"> & { distance?: number }>
): ParsedTrack {
  const points = enrichPoints(rawPoints);

  return {
    name,
    fileName,
    kind,
    points,
    bounds: calculateBounds(points),
    stats: calculateTrackStats(points)
  };
}

function gpxPointToTrackPoint(point: GpxPoint): Omit<TrackPoint, "distance"> | undefined {
  const lat = toNumber(point.lat);
  const lon = toNumber(point.lon);

  if (lat === undefined || lon === undefined) {
    return undefined;
  }

  const extensions = flattenValues(point.extensions);

  return {
    lat,
    lon,
    ele: toNumber(point.ele),
    time: parseDate(point.time),
    heartRate: findMetric(extensions, ["hr", "heartrate", "heartratebpm", "heartRate"]),
    cadence: findMetric(extensions, ["cad", "cadence"]),
    power: findMetric(extensions, ["power", "watts"]),
    temperature: findMetric(extensions, ["temp", "temperature", "atemp"])
  };
}

function fitRecordToTrackPoint(record: FitRecord): (Omit<TrackPoint, "distance"> & { distance?: number }) | undefined {
  const lat = semicirclesToDegrees(record.positionLat);
  const lon = semicirclesToDegrees(record.positionLong);

  if (lat === undefined || lon === undefined) {
    return undefined;
  }

  return {
    lat,
    lon,
    ele: record.enhancedAltitude ?? record.altitude,
    time: parseDate(record.timestamp),
    distance: record.distance,
    speed: record.enhancedSpeed ?? record.speed,
    heartRate: record.heartRate,
    cadence: record.cadence,
    power: record.power,
    temperature: record.temperature
  };
}

function detectKind(file: File): FileKind | undefined {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "gpx") {
    return "gpx";
  }

  if (extension === "fit") {
    return "fit";
  }

  return undefined;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isPoint(point: Omit<TrackPoint, "distance"> | undefined): point is Omit<TrackPoint, "distance"> {
  return Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

function semicirclesToDegrees(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return (value * 180) / 2 ** 31;
}

function flattenValues(value: unknown, prefix = "", output: Record<string, number> = {}) {
  if (!value || typeof value !== "object") {
    return output;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    const normalizedKey = normalizeKey(prefix ? `${prefix}.${key}` : key);
    const numericValue = toNumber(child);

    if (numericValue !== undefined) {
      output[normalizedKey] = numericValue;
      output[normalizeKey(key)] = numericValue;
      return;
    }

    if (typeof child === "object") {
      flattenValues(child, normalizedKey, output);
    }
  });

  return output;
}

function findMetric(values: Record<string, number>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    const exact = values[normalized];
    if (typeof exact === "number") {
      return exact;
    }

    const partialKey = Object.keys(values).find((candidate) => candidate.endsWith(normalized) || candidate.includes(normalized));
    if (partialKey) {
      return values[partialKey];
    }
  }

  return undefined;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fitTrackName(messages: FitMessages, fileName: string) {
  const session = messages.sessionMesgs?.[0];
  const created = parseDate(messages.fileIdMesgs?.[0]?.timeCreated ?? messages.activityMesgs?.[0]?.timestamp);
  const date = created ? created.toLocaleDateString() : undefined;
  const sport = [session?.sport, session?.subSport].filter(Boolean).join(" / ");

  return [sport || "FIT Activity", date].filter(Boolean).join(" - ") || fileName;
}
