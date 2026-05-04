import { useCallback, useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map } from "maplibre-gl";
import type { Bounds, MapHoverPoint, Track, TrackPoint } from "../types";
import { mapStyle } from "../lib/mapStyle";
import { BASEMAPS, type BasemapId } from "../lib/basemaps";

type FocusRequest = {
  trackId: string;
  nonce: number;
};

type MapViewProps = {
  tracks: Track[];
  filterBounds: Bounds | null;
  selectionMode: boolean;
  selectionResetToken: number;
  focusRequest: FocusRequest | null;
  basemapId: BasemapId;
  showDirectionArrows: boolean;
  onHoverPointReady: (handler: (point: MapHoverPoint | null) => void) => void;
  onSelection: (bounds: Bounds) => void;
  onTrackSelect: (trackId: string) => void;
};

const TRACK_SOURCE_ID = "tracks";
const SELECTION_SOURCE_ID = "selection-bounds";
const ARROW_SOURCE_ID = "direction-arrows";
const TRACKER_SOURCE_ID = "track-hover-marker";

type GeoJsonData = Parameters<GeoJSONSource["setData"]>[0];

export default function MapView({
  tracks,
  filterBounds,
  selectionMode,
  selectionResetToken,
  focusRequest,
  basemapId,
  showDirectionArrows,
  onHoverPointReady,
  onSelection,
  onTrackSelect
}: MapViewProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const loadedRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const onTrackSelectRef = useRef(onTrackSelect);
  const selectionModeRef = useRef(selectionMode);
  const dragRectRef = useRef<HTMLDivElement | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const lastFocusNonceRef = useRef<number | null>(null);
  const trackerPointRef = useRef<MapHoverPoint | null>(null);

  const trackData = useMemo(() => tracksToGeoJson(tracks, Boolean(filterBounds)), [tracks, filterBounds]);
  const arrowData = useMemo(() => arrowsToGeoJson(tracks, Boolean(filterBounds)), [tracks, filterBounds]);
  const selectionData = useMemo(() => boundsToGeoJson(filterBounds), [filterBounds]);
  const trackDataRef = useRef(trackData);
  const arrowDataRef = useRef(arrowData);
  const selectionDataRef = useRef(selectionData);
  const basemapIdRef = useRef(basemapId);
  const showDirectionArrowsRef = useRef(showDirectionArrows);

  const renderDragRect = useCallback((rect: null | { left: number; top: number; width: number; height: number }) => {
    const element = dragRectRef.current;
    if (!element) {
      return;
    }

    if (!rect) {
      element.style.display = "none";
      return;
    }

    element.style.display = "block";
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
  }, []);

  const updateTrackerPoint = useCallback((point: MapHoverPoint | null) => {
    trackerPointRef.current = point;
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    updateSource(map, TRACKER_SOURCE_ID, hoverPointToGeoJson(point));
  }, []);

  useEffect(() => {
    onTrackSelectRef.current = onTrackSelect;
  }, [onTrackSelect]);

  useEffect(() => {
    trackDataRef.current = trackData;
  }, [trackData]);

  useEffect(() => {
    arrowDataRef.current = arrowData;
  }, [arrowData]);

  useEffect(() => {
    selectionDataRef.current = selectionData;
  }, [selectionData]);

  useEffect(() => {
    onHoverPointReady(updateTrackerPoint);
    return () => onHoverPointReady(() => {});
  }, [onHoverPointReady, updateTrackerPoint]);

  useEffect(() => {
    basemapIdRef.current = basemapId;
  }, [basemapId]);

  useEffect(() => {
    showDirectionArrowsRef.current = showDirectionArrows;
  }, [showDirectionArrows]);

  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  useEffect(() => {
    startPointRef.current = null;
    renderDragRect(null);
  }, [renderDragRect, selectionResetToken]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [104, 34],
      zoom: 1.45,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      renderWorldCopies: false,
      boxZoom: false,
      aroundCenter: true
    });

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true
      }),
      "top-right"
    );
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true
      }),
      "bottom-right"
    );

    map.on("load", () => {
      loadedRef.current = true;
      map.setProjection({ type: "globe" });
      map.addSource(TRACK_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection()
      });
      map.addSource(SELECTION_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection()
      });
      map.addSource(ARROW_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection()
      });
      map.addSource(TRACKER_SOURCE_ID, {
        type: "geojson",
        data: emptyFeatureCollection()
      });

      map.addLayer({
        id: "selection-fill",
        type: "fill",
        source: SELECTION_SOURCE_ID,
        paint: {
          "fill-color": "#1d9a8a",
          "fill-opacity": 0.16
        }
      });
      map.addLayer({
        id: "selection-line",
        type: "line",
        source: SELECTION_SOURCE_ID,
        paint: {
          "line-color": "#166b61",
          "line-width": 2,
          "line-dasharray": [1.4, 1.2]
        }
      });
      map.addLayer({
        id: "tracks-casing",
        type: "line",
        source: TRACK_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#0f172a",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            ["case", ["boolean", ["get", "selected"], false], 2.4, 1.7],
            5,
            ["case", ["boolean", ["get", "selected"], false], 5, 3.6],
            12,
            ["case", ["boolean", ["get", "selected"], false], 8, 5.4]
          ],
          "line-opacity": 0.42
        }
      });
      map.addLayer({
        id: "tracks-lines",
        type: "line",
        source: TRACK_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#d94848"],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            ["case", ["boolean", ["get", "selected"], false], 1.6, 1],
            5,
            ["case", ["boolean", ["get", "selected"], false], 3.4, 2.2],
            12,
            ["case", ["boolean", ["get", "selected"], false], 5.6, 3.8]
          ],
          "line-opacity": ["case", ["boolean", ["get", "selected"], false], 1, 0.88]
        }
      });
      map.addLayer({
        id: "tracks-selected-halo",
        type: "line",
        source: TRACK_SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 5.2, 5, 9, 12, 13],
          "line-opacity": 0.92
        }
      });
      map.addLayer({
        id: "tracks-selected-casing",
        type: "line",
        source: TRACK_SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#0f172a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 3.7, 5, 6.4, 12, 9],
          "line-opacity": 0.82
        }
      });
      map.addLayer({
        id: "tracks-selected-line",
        type: "line",
        source: TRACK_SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#d94848"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2.1, 5, 4.4, 12, 6.4],
          "line-opacity": 1
        }
      });
      ensureArrowImage(map);
      map.addLayer({
        id: "direction-arrows",
        type: "symbol",
        source: ARROW_SOURCE_ID,
        layout: {
          "icon-image": "direction-arrow",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.34, 10, 0.62],
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          visibility: showDirectionArrowsRef.current ? "visible" : "none"
        },
        paint: {
          "icon-color": ["coalesce", ["get", "color"], "#d94848"],
          "icon-halo-color": "#ffffff",
          "icon-halo-width": 1.4,
          "icon-opacity": 0.92
        }
      });
      map.addLayer({
        id: "track-hover-halo",
        type: "circle",
        source: TRACKER_SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 8, 7, 13, 9],
          "circle-color": "#ffffff",
          "circle-opacity": 0.92,
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1.25
        }
      });
      map.addLayer({
        id: "track-hover-dot",
        type: "circle",
        source: TRACKER_SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.75, 8, 4, 13, 5.5],
          "circle-color": ["coalesce", ["get", "color"], "#101820"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.25
        }
      });
      map.on("mouseenter", "tracks-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mousemove", "tracks-lines", (event) => {
        const feature = event.features?.[0];
        const trackName = feature?.properties?.trackName;
        if (typeof trackName !== "string" || !event.lngLat) {
          return;
        }

        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
            className: "track-hover-popup"
          });
        }

        hoverPopupRef.current.setLngLat(event.lngLat).setHTML(escapeHtml(trackName)).addTo(map);
      });
      map.on("mouseleave", "tracks-lines", () => {
        map.getCanvas().style.cursor = selectionModeRef.current ? "crosshair" : "";
        hoverPopupRef.current?.remove();
      });
      map.on("click", "tracks-lines", (event) => {
        const trackId = event.features?.[0]?.properties?.trackId;
        if (typeof trackId === "string") {
          onTrackSelectRef.current(trackId);
        }
      });

      updateSource(map, TRACK_SOURCE_ID, trackDataRef.current);
      updateSource(map, ARROW_SOURCE_ID, arrowDataRef.current);
      updateSource(map, SELECTION_SOURCE_ID, selectionDataRef.current);
      updateSource(map, TRACKER_SOURCE_ID, hoverPointToGeoJson(trackerPointRef.current));
      setBasemapVisibility(map, basemapIdRef.current);
    });

    mapRef.current = map;

    return () => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    setBasemapVisibility(map, basemapId);
  }, [basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    updateSource(map, TRACK_SOURCE_ID, trackData);
  }, [trackData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    updateSource(map, ARROW_SOURCE_ID, arrowData);
  }, [arrowData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer("direction-arrows")) {
      return;
    }

    map.setLayoutProperty("direction-arrows", "visibility", showDirectionArrows ? "visible" : "none");
  }, [showDirectionArrows]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    updateSource(map, SELECTION_SOURCE_ID, selectionData);
  }, [selectionData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (selectionMode) {
      map.dragPan.disable();
      map.getCanvas().style.cursor = "crosshair";
    } else {
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
      startPointRef.current = null;
    }
  }, [selectionMode]);

  const fitPoints = useCallback((points: TrackPoint[]) => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    const bounds = boundsFromPoints(points, map.getCenter().lng);
    if (!bounds) {
      return;
    }

    const padding = {
      top: 84,
      bottom: 260,
      left: 380,
      right: 80
    };
    const lngDelta = Math.max(0.01, (bounds.east - bounds.west) * 0.08);
    const latDelta = Math.max(0.01, (bounds.north - bounds.south) * 0.08);
    const padded: LngLatBoundsLike = [
      [bounds.west - lngDelta, bounds.south - latDelta],
      [bounds.east + lngDelta, bounds.north + latDelta]
    ];

    map.fitBounds(padded, {
      padding,
      maxZoom: 14,
      duration: 850
    });
  }, []);

  useEffect(() => {
    const request = focusRequest;
    if (!request || lastFocusNonceRef.current === request.nonce) {
      return;
    }

    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      return;
    }

    lastFocusNonceRef.current = request.nonce;

    if (request.trackId === "__all__") {
      const visibleTracks = tracks.filter((track) => track.visible && (!filterBounds || track.matched));
      fitPoints(visibleTracks.flatMap((track) => track.displayPoints.length ? track.displayPoints : track.points));
      return;
    }

    const track = tracks.find((item) => item.id === request.trackId);
    if (track) {
      fitPoints(track.points);
    }
  }, [filterBounds, fitPoints, focusRequest, tracks]);

  useEffect(() => {
    const container = shellRef.current;
    const map = mapRef.current;
    if (!container || !map) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!selectionMode || event.button !== 0) {
        return;
      }

      event.preventDefault();
      container.setPointerCapture(event.pointerId);
      const rect = container.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      startPointRef.current = point;
      renderDragRect({ left: point.x, top: point.y, width: 0, height: 0 });
    };

    const handlePointerMove = (event: PointerEvent) => {
      const start = startPointRef.current;
      if (!selectionMode || !start) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      renderDragRect({
        left: Math.min(start.x, current.x),
        top: Math.min(start.y, current.y),
        width: Math.abs(current.x - start.x),
        height: Math.abs(current.y - start.y)
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = startPointRef.current;
      if (!selectionMode || !start) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);

      startPointRef.current = null;
      renderDragRect(null);

      if (width < 8 || height < 8) {
        return;
      }

      const left = Math.min(start.x, current.x);
      const right = Math.max(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const bottom = Math.max(start.y, current.y);
      const northwest = map.unproject([left, top]);
      const southeast = map.unproject([right, bottom]);

      onSelection({
        west: Math.min(northwest.lng, southeast.lng),
        south: Math.min(northwest.lat, southeast.lat),
        east: Math.max(northwest.lng, southeast.lng),
        north: Math.max(northwest.lat, southeast.lat)
      });
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onSelection, renderDragRect, selectionMode]);

  return (
    <div className="map-shell" ref={shellRef}>
      <div className="map-container" ref={containerRef} />
      <div className="drag-selection" ref={dragRectRef} />
    </div>
  );
}

function updateSource(map: Map, sourceId: string, data: GeoJsonData) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
}

function emptyFeatureCollection(): GeoJsonData {
  return {
    type: "FeatureCollection" as const,
    features: []
  };
}

function tracksToGeoJson(tracks: Track[], filterActive: boolean): GeoJsonData {
  return {
    type: "FeatureCollection" as const,
    features: tracks
      .filter((track) => track.visible && (!filterActive || track.matched) && track.points.length >= 2)
      .map((track) => ({
        type: "Feature" as const,
        properties: {
          trackId: track.id,
          trackName: track.name,
          color: track.color,
          selected: track.selected
        },
        geometry: {
          type: "LineString" as const,
          coordinates: track.displayPoints.map((point) => [point.lon, point.lat, point.ele ?? 0])
        }
      }))
  };
}

function arrowsToGeoJson(tracks: Track[], filterActive: boolean): GeoJsonData {
  return {
    type: "FeatureCollection" as const,
    features: tracks
      .filter((track) => track.visible && (!filterActive || track.matched) && track.displayPoints.length >= 2)
      .flatMap((track) => directionArrowFeatures(track))
  };
}

function hoverPointToGeoJson(hover: MapHoverPoint | null): GeoJsonData {
  if (!hover) {
    return emptyFeatureCollection();
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {
          trackId: hover.trackId,
          trackName: hover.trackName,
          color: hover.color
        },
        geometry: {
          type: "Point" as const,
          coordinates: [hover.point.lon, hover.point.lat]
        }
      }
    ]
  };
}

function boundsToGeoJson(bounds: Bounds | null): GeoJsonData {
  if (!bounds) {
    return emptyFeatureCollection();
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [bounds.west, bounds.south],
              [bounds.east, bounds.south],
              [bounds.east, bounds.north],
              [bounds.west, bounds.north],
              [bounds.west, bounds.south]
            ]
          ]
        }
      }
    ]
  };
}

function directionArrowFeatures(track: Track) {
  const spacing = Math.max(15, Math.floor(track.displayPoints.length / 24));
  const features = [];

  for (let index = spacing; index < track.displayPoints.length - 1; index += spacing) {
    const previous = track.displayPoints[index - 1];
    const point = track.displayPoints[index];
    const next = track.displayPoints[index + 1];

    features.push({
      type: "Feature" as const,
      properties: {
        trackId: track.id,
        color: track.color,
        bearing: calculateBearing(previous, next)
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point.lon, point.lat, point.ele ?? 0]
      }
    });
  }

  return features;
}

function calculateBearing(a: TrackPoint, b: TrackPoint) {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function setBasemapVisibility(map: Map, basemapId: BasemapId) {
  const basemap = BASEMAPS.find((item) => item.id === basemapId) ?? BASEMAPS[0];
  map.setPaintProperty("earth-water", "background-color", basemap.background);

  for (const item of BASEMAPS) {
    const layerId = `basemap-${item.id}`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", item.id === basemap.id ? "visible" : "none");
    }
  }
}

function ensureArrowImage(map: Map) {
  if (map.hasImage("direction-arrow")) {
    return;
  }

  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(24, 5);
  context.lineTo(39, 39);
  context.lineTo(24, 31);
  context.lineTo(9, 39);
  context.closePath();
  context.fill();
  context.strokeStyle = "#0f172a";
  context.lineWidth = 3;
  context.stroke();
  map.addImage("direction-arrow", context.getImageData(0, 0, size, size), { sdf: true, pixelRatio: 2 });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function boundsFromPoints(points: TrackPoint[], referenceLng: number): Bounds | undefined {
  const usablePoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (!usablePoints.length) {
    return undefined;
  }

  let south = clampMapLat(usablePoints[0].lat);
  let north = south;
  const longitudes: number[] = [];

  for (const point of usablePoints) {
    const lat = clampMapLat(point.lat);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    longitudes.push(normalizeLongitude360(point.lon));
  }

  const longitudeBounds = shortestLongitudeBounds(longitudes, referenceLng);

  return {
    west: longitudeBounds.west,
    south,
    east: longitudeBounds.east,
    north
  };
}

function shortestLongitudeBounds(longitudes: number[], referenceLng: number) {
  if (longitudes.length === 1) {
    const lng = closestLongitudeToReference(signedLongitude(longitudes[0]), referenceLng);
    return { west: lng, east: lng };
  }

  const sorted = [...longitudes].sort((a, b) => a - b);
  let largestGap = -1;
  let gapIndex = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
    const gap = next - current;
    if (gap > largestGap) {
      largestGap = gap;
      gapIndex = index;
    }
  }

  const westNormalized = sorted[(gapIndex + 1) % sorted.length];
  const span = Math.max(0, 360 - largestGap);
  const westBase = signedLongitude(westNormalized);
  const eastBase = westBase + span;
  const centerBase = westBase + span / 2;
  const shift = Math.round((referenceLng - centerBase) / 360) * 360;

  return {
    west: westBase + shift,
    east: eastBase + shift
  };
}

function normalizeLongitude360(lng: number) {
  return ((lng % 360) + 360) % 360;
}

function signedLongitude(lng: number) {
  return lng > 180 ? lng - 360 : lng;
}

function closestLongitudeToReference(lng: number, referenceLng: number) {
  return lng + Math.round((referenceLng - lng) / 360) * 360;
}

function clampMapLat(lat: number) {
  return Math.max(-85.051129, Math.min(85.051129, lat));
}
