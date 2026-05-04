import type { Bounds, Track, TrackPoint } from "../types";
import { haversineDistance } from "./geo";

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const INDEX_PRECISION = 4;
const MAX_QUERY_HASHES = 1500;

const CELL_SIZE_METERS_BY_PRECISION: Record<number, number> = {
  1: 5000000,
  2: 1250000,
  3: 156000,
  4: 39100,
  5: 4890,
  6: 1220,
  7: 153,
  8: 38
};

export function encodeGeohash(lat: number, lon: number, precision = INDEX_PRECISION) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx *= 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx *= 2;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;

    if (bit < 4) {
      bit += 1;
    } else {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

export function buildTrackGeohashes(points: TrackPoint[]) {
  const hashes = new Set<string>();

  points.forEach((point, index) => {
    hashes.add(encodeGeohash(point.lat, point.lon));

    if (index === 0) {
      return;
    }

    for (const sample of sampleSegment(points[index - 1], point)) {
      hashes.add(encodeGeohash(sample.lat, sample.lon));
    }
  });

  return hashes;
}

export function filterCandidateTracks(tracks: Track[], bounds: Bounds) {
  const queryHashes = geohashesForBounds(bounds);
  if (!queryHashes.size) {
    return tracks;
  }

  return tracks.filter((track) => setIntersects(track.geohashes, queryHashes));
}

function geohashesForBounds(bounds: Bounds) {
  const hashes = new Set<string>();
  const centerLat = (bounds.north + bounds.south) / 2;
  const latStep = 0.18;
  const lonStep = Math.max(0.18 / Math.max(0.2, Math.cos((centerLat * Math.PI) / 180)), 0.18);

  for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
    for (let lon = bounds.west; lon <= bounds.east; lon += lonStep) {
      hashes.add(encodeGeohash(lat, lon));
      if (hashes.size > MAX_QUERY_HASHES) {
        return new Set<string>();
      }
    }
  }

  hashes.add(encodeGeohash(bounds.north, bounds.east));
  hashes.add(encodeGeohash(bounds.north, bounds.west));
  hashes.add(encodeGeohash(bounds.south, bounds.east));
  hashes.add(encodeGeohash(bounds.south, bounds.west));

  return hashes;
}

function sampleSegment(a: TrackPoint, b: TrackPoint) {
  const distance = haversineDistance(a, b);
  const step = CELL_SIZE_METERS_BY_PRECISION[INDEX_PRECISION] / 2;
  const sampleCount = Math.min(200, Math.floor(distance / step));
  const samples: Array<Pick<TrackPoint, "lat" | "lon">> = [];

  for (let index = 1; index < sampleCount; index += 1) {
    const ratio = index / sampleCount;
    samples.push({
      lat: a.lat + (b.lat - a.lat) * ratio,
      lon: a.lon + (b.lon - a.lon) * ratio
    });
  }

  return samples;
}

function setIntersects(a: Set<string>, b: Set<string>) {
  for (const value of b) {
    if (a.has(value)) {
      return true;
    }
  }

  return false;
}
