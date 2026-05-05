import type { MetricKey, TrackPoint } from "../../types";

type ProjectedPoint = {
  index: number;
  x: number;
  y: number;
};

const WEB_MERCATOR_RADIUS = 6378137;

export function simplifyTrackPoints(points: TrackPoint[]) {
  if (points.length <= 2500) {
    return points;
  }

  const tolerance = toleranceForPointCount(points.length);
  const projected = points.map((point, index) => ({
    index,
    ...project(point)
  }));
  const keep = new Set<number>([0, points.length - 1]);
  simplifyRange(projected, 0, projected.length - 1, tolerance * tolerance, keep);

  return [...keep]
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

export function downsampleMetricPoints(points: TrackPoint[], metricKeys: MetricKey[], targetCount = 1800) {
  if (points.length <= targetCount) {
    return points.map((point, pointIndex) => ({ ...point, pointIndex }));
  }

  const bucketSize = Math.max(2, Math.ceil(points.length / Math.floor(targetCount / 2)));
  const keep = new Set<number>([0, points.length - 1]);

  for (let start = 0; start < points.length; start += bucketSize) {
    const end = Math.min(points.length, start + bucketSize);
    keep.add(start);

    for (const key of metricKeys) {
      let minIndex = -1;
      let maxIndex = -1;
      let minValue = Number.POSITIVE_INFINITY;
      let maxValue = Number.NEGATIVE_INFINITY;

      for (let index = start; index < end; index += 1) {
        const value = points[index][key];
        if (typeof value !== "number" || !Number.isFinite(value)) {
          continue;
        }

        if (value < minValue) {
          minValue = value;
          minIndex = index;
        }

        if (value > maxValue) {
          maxValue = value;
          maxIndex = index;
        }
      }

      if (minIndex >= 0) {
        keep.add(minIndex);
      }

      if (maxIndex >= 0) {
        keep.add(maxIndex);
      }
    }
  }

  return limitSortedIndexes([...keep].sort((a, b) => a - b), Math.floor(targetCount * 1.3)).map((pointIndex) => ({
    ...points[pointIndex],
    pointIndex
  }));
}

function limitSortedIndexes(indexes: number[], maxCount: number) {
  if (indexes.length <= maxCount) {
    return indexes;
  }

  const limited = new Set<number>();
  const last = indexes.length - 1;

  for (let index = 0; index < maxCount; index += 1) {
    limited.add(indexes[Math.round((index * last) / (maxCount - 1))]);
  }

  return [...limited].sort((a, b) => a - b);
}

function simplifyRange(points: ProjectedPoint[], first: number, last: number, squaredTolerance: number, keep: Set<number>) {
  let maxSquaredDistance = squaredTolerance;
  let indexToKeep = -1;

  for (let index = first + 1; index < last; index += 1) {
    const squaredDistance = squaredSegmentDistance(points[index], points[first], points[last]);
    if (squaredDistance > maxSquaredDistance) {
      indexToKeep = index;
      maxSquaredDistance = squaredDistance;
    }
  }

  if (indexToKeep < 0) {
    return;
  }

  keep.add(points[indexToKeep].index);
  simplifyRange(points, first, indexToKeep, squaredTolerance, keep);
  simplifyRange(points, indexToKeep, last, squaredTolerance, keep);
}

function squaredSegmentDistance(point: ProjectedPoint, a: ProjectedPoint, b: ProjectedPoint) {
  let x = a.x;
  let y = a.y;
  let dx = b.x - x;
  let dy = b.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy)));
    x += dx * t;
    y += dy * t;
  }

  dx = point.x - x;
  dy = point.y - y;

  return dx * dx + dy * dy;
}

function project(point: TrackPoint) {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, point.lat));
  const x = (point.lon * Math.PI * WEB_MERCATOR_RADIUS) / 180;
  const y = WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

  return { x, y };
}

function toleranceForPointCount(count: number) {
  if (count > 100000) {
    return 35;
  }

  if (count > 50000) {
    return 24;
  }

  if (count > 20000) {
    return 14;
  }

  if (count > 8000) {
    return 8;
  }

  return 4;
}
