export type FileKind = "gpx" | "fit";

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type TrackPoint = {
  lat: number;
  lon: number;
  ele?: number;
  time?: Date;
  distance: number;
  speed?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
};

export type MetricKey = keyof Pick<
  TrackPoint,
  "ele" | "speed" | "heartRate" | "cadence" | "power" | "temperature"
>;

export type TrackStats = {
  distance: number;
  duration?: number;
  movingTime?: number;
  elevationGain: number;
  elevationLoss: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgPower?: number;
  maxPower?: number;
};

export type Track = {
  id: string;
  name: string;
  fileName: string;
  kind: FileKind;
  color: string;
  visible: boolean;
  selected: boolean;
  matched: boolean;
  points: TrackPoint[];
  bounds: Bounds;
  stats: TrackStats;
  geohashes: Set<string>;
};

export type ParsedTrack = Omit<
  Track,
  "id" | "color" | "visible" | "selected" | "matched" | "geohashes"
>;

export type UploadResult = {
  tracks: ParsedTrack[];
  errors: string[];
};
