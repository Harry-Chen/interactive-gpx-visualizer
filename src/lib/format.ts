export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) {
    return "-";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "-";
  }

  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m`;
  }

  return `${minutes}m ${pad(secs)}s`;
}

export function formatSpeed(speed?: number) {
  if (typeof speed !== "number" || !Number.isFinite(speed)) {
    return "-";
  }

  return `${(speed * 3.6).toFixed(1)} km/h`;
}

export function formatNumber(value?: number, unit = "", digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}${unit}`;
}

export function formatDateTime(date?: Date) {
  if (!date || Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}
