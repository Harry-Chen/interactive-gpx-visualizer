export type MapUrlView = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type MapViewSource = {
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getBearing: () => number;
  getPitch: () => number;
};

const DEFAULT_VIEW: MapUrlView = {
  center: [104, 34],
  zoom: 1.45,
  bearing: 0,
  pitch: 0
};

export function readMapViewFromUrl(): MapUrlView {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW;
  }

  const params = new URLSearchParams(window.location.search);
  const lat = readBoundedNumber(params, "lat", -85, 85);
  const lng = readBoundedNumber(params, "lng", -180, 180);

  return {
    center: lat === undefined || lng === undefined ? DEFAULT_VIEW.center : [lng, lat],
    zoom: readBoundedNumber(params, "zoom", 0, 22) ?? DEFAULT_VIEW.zoom,
    bearing: readBoundedNumber(params, "bearing", -180, 180) ?? DEFAULT_VIEW.bearing,
    pitch: readBoundedNumber(params, "pitch", 0, 85) ?? DEFAULT_VIEW.pitch
  };
}

export function writeMapViewToUrl(map: MapViewSource) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const center = map.getCenter();
  url.searchParams.set("lat", formatNumber(center.lat, 5));
  url.searchParams.set("lng", formatNumber(center.lng, 5));
  url.searchParams.set("zoom", formatNumber(map.getZoom(), 2));

  setOptionalViewParam(url.searchParams, "bearing", normalizeBearing(map.getBearing()), 1);
  setOptionalViewParam(url.searchParams, "pitch", map.getPitch(), 1);

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
}

function readBoundedNumber(params: URLSearchParams, key: string, min: number, max: number) {
  const rawValue = params.get(key);
  if (rawValue === null || !rawValue.trim()) {
    return undefined;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < min || value > max) {
    return undefined;
  }

  return value;
}

function setOptionalViewParam(params: URLSearchParams, key: string, value: number, fractionDigits: number) {
  if (Math.abs(value) < 0.05) {
    params.delete(key);
    return;
  }

  params.set(key, formatNumber(value, fractionDigits));
}

function formatNumber(value: number, fractionDigits: number) {
  return Number(value.toFixed(fractionDigits)).toString();
}

function normalizeBearing(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
  return normalized === -180 ? 180 : normalized;
}
