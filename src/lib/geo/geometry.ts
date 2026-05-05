import type { Bounds, TrackPoint } from "../../types";

const EARTH_RADIUS_METERS = 6371008.8;

export function haversineDistance(a: Pick<TrackPoint, "lat" | "lon">, b: Pick<TrackPoint, "lat" | "lon">) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function calculateBounds(points: TrackPoint[]): Bounds {
  if (points.length === 0) {
    return { west: 0, south: 0, east: 0, north: 0 };
  }

  return points.reduce<Bounds>(
    (bounds, point) => ({
      west: Math.min(bounds.west, point.lon),
      south: Math.min(bounds.south, point.lat),
      east: Math.max(bounds.east, point.lon),
      north: Math.max(bounds.north, point.lat)
    }),
    {
      west: points[0].lon,
      south: points[0].lat,
      east: points[0].lon,
      north: points[0].lat
    }
  );
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

export function normalizeBounds(a: Pick<TrackPoint, "lat" | "lon">, b: Pick<TrackPoint, "lat" | "lon">): Bounds {
  return {
    west: Math.min(a.lon, b.lon),
    south: Math.min(a.lat, b.lat),
    east: Math.max(a.lon, b.lon),
    north: Math.max(a.lat, b.lat)
  };
}

export function pointInBounds(point: TrackPoint, bounds: Bounds) {
  return point.lon >= bounds.west && point.lon <= bounds.east && point.lat >= bounds.south && point.lat <= bounds.north;
}

export function segmentIntersectsBounds(a: TrackPoint, b: TrackPoint, bounds: Bounds) {
  if (pointInBounds(a, bounds) || pointInBounds(b, bounds)) {
    return true;
  }

  const segmentBounds = normalizeBounds(a, b);
  if (!boundsIntersect(segmentBounds, bounds)) {
    return false;
  }

  const corners = [
    { lat: bounds.south, lon: bounds.west },
    { lat: bounds.south, lon: bounds.east },
    { lat: bounds.north, lon: bounds.east },
    { lat: bounds.north, lon: bounds.west }
  ];

  return corners.some((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    return segmentsIntersect(a, b, corner, next);
  });
}

export function routeIntersectsBounds(points: TrackPoint[], bounds: Bounds) {
  if (points.length === 0) {
    return false;
  }

  for (let index = 0; index < points.length; index += 1) {
    if (pointInBounds(points[index], bounds)) {
      return true;
    }

    if (index > 0 && segmentIntersectsBounds(points[index - 1], points[index], bounds)) {
      return true;
    }
  }

  return false;
}

function segmentsIntersect(
  a: Pick<TrackPoint, "lat" | "lon">,
  b: Pick<TrackPoint, "lat" | "lon">,
  c: Pick<TrackPoint, "lat" | "lon">,
  d: Pick<TrackPoint, "lat" | "lon">
) {
  const d1 = direction(c, d, a);
  const d2 = direction(c, d, b);
  const d3 = direction(a, b, c);
  const d4 = direction(a, b, d);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  return (
    (d1 === 0 && onSegment(c, d, a)) ||
    (d2 === 0 && onSegment(c, d, b)) ||
    (d3 === 0 && onSegment(a, b, c)) ||
    (d4 === 0 && onSegment(a, b, d))
  );
}

function direction(
  a: Pick<TrackPoint, "lat" | "lon">,
  b: Pick<TrackPoint, "lat" | "lon">,
  c: Pick<TrackPoint, "lat" | "lon">
) {
  return (c.lon - a.lon) * (b.lat - a.lat) - (b.lon - a.lon) * (c.lat - a.lat);
}

function onSegment(
  a: Pick<TrackPoint, "lat" | "lon">,
  b: Pick<TrackPoint, "lat" | "lon">,
  c: Pick<TrackPoint, "lat" | "lon">
) {
  return (
    Math.min(a.lon, b.lon) <= c.lon &&
    c.lon <= Math.max(a.lon, b.lon) &&
    Math.min(a.lat, b.lat) <= c.lat &&
    c.lat <= Math.max(a.lat, b.lat)
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
