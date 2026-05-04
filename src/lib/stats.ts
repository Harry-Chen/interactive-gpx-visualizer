import type { TrackPoint, TrackStats } from "../types";
import { haversineDistance } from "./geo";

const MOVING_SPEED_THRESHOLD = 0.6;

type RawTrackPoint = Omit<TrackPoint, "distance"> & { distance?: number };

export function enrichPoints(points: RawTrackPoint[]): TrackPoint[] {
  let computedDistance = 0;
  let previousOutputDistance = 0;
  let distanceOffset: number | undefined;

  return points.map((point, index) => {
    const previous = index > 0 ? points[index - 1] : undefined;
    if (previous) {
      computedDistance += haversineDistance(previous as TrackPoint, point as TrackPoint);
    }

    const sourceDistance = Number.isFinite(point.distance) ? point.distance : undefined;
    if (distanceOffset === undefined && sourceDistance !== undefined) {
      distanceOffset = sourceDistance;
    }

    const distance = sourceDistance !== undefined ? Math.max(0, sourceDistance - (distanceOffset ?? 0)) : computedDistance;
    const computedSpeed =
      previous?.time && point.time
        ? safeSpeed(distance - previousOutputDistance, point.time.getTime() - previous.time.getTime())
        : undefined;
    previousOutputDistance = distance;

    return {
      ...point,
      distance,
      speed: point.speed ?? computedSpeed
    };
  });
}

export function calculateTrackStats(points: TrackPoint[]): TrackStats {
  const distance = points.at(-1)?.distance ?? 0;
  const firstTime = points.find((point) => point.time)?.time;
  const lastTime = findLast(points, (point) => Boolean(point.time))?.time;
  const duration = firstTime && lastTime ? Math.max(0, (lastTime.getTime() - firstTime.getTime()) / 1000) : undefined;

  let movingTime = 0;
  let elevationGain = 0;
  let elevationLoss = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];

    if (previous.time && point.time) {
      const deltaSeconds = (point.time.getTime() - previous.time.getTime()) / 1000;
      const speed = point.speed ?? (deltaSeconds > 0 ? (point.distance - previous.distance) / deltaSeconds : 0);
      if (speed >= MOVING_SPEED_THRESHOLD && deltaSeconds > 0) {
        movingTime += deltaSeconds;
      }
    }

    if (typeof previous.ele === "number" && typeof point.ele === "number") {
      const deltaEle = point.ele - previous.ele;
      if (deltaEle > 0) {
        elevationGain += deltaEle;
      } else {
        elevationLoss += Math.abs(deltaEle);
      }
    }
  }

  const speeds = numbers(points.map((point) => point.speed));
  const heartRates = numbers(points.map((point) => point.heartRate));
  const cadences = numbers(points.map((point) => point.cadence));
  const powers = numbers(points.map((point) => point.power));

  return {
    distance,
    duration,
    movingTime: movingTime || undefined,
    elevationGain,
    elevationLoss,
    avgSpeed: average(speeds),
    maxSpeed: max(speeds),
    avgHeartRate: average(heartRates),
    maxHeartRate: max(heartRates),
    avgCadence: average(cadences),
    maxCadence: max(cadences),
    avgPower: average(powers),
    maxPower: max(powers)
  };
}

export function numbers(values: Array<number | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

export function max(values: number[]) {
  return values.length ? Math.max(...values) : undefined;
}

function safeSpeed(distance: number, milliseconds: number) {
  if (milliseconds <= 0) {
    return undefined;
  }

  return distance / (milliseconds / 1000);
}

function findLast<T>(values: T[], predicate: (value: T) => boolean) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index])) {
      return values[index];
    }
  }

  return undefined;
}
