import { useCallback, useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map } from "maplibre-gl";
import type { Bounds, Track, TrackPoint } from "../types";
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
  hoveredPoint: TrackPoint | null;
  onSelection: (bounds: Bounds) => void;
  onTrackSelect: (trackId: string) => void;
};

const TRACK_SOURCE_ID = "tracks";
const SELECTION_SOURCE_ID = "selection-bounds";
const ARROW_SOURCE_ID = "direction-arrows";
const HOVER_SOURCE_ID = "hover-point";

type GeoJsonData = Parameters<GeoJSONSource["setData"]>[0];

export default function MapView({
  tracks,
  filterBounds,
  selectionMode,
  selectionResetToken,
  focusRequest,
  basemapId,
  showDirectionArrows,
  hoveredPoint,
  onSelection,
  onTrackSelect
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const loadedRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const onTrackSelectRef = useRef(onTrackSelect);
  const selectionModeRef = useRef(selectionMode);
  const dragRectRef = useRef<HTMLDivElement | null>(null);

  const trackData = useMemo(() => tracksToGeoJson(tracks, Boolean(filterBounds)), [tracks, filterBounds]);
  const arrowData = useMemo(() => arrowsToGeoJson(tracks, Boolean(filterBounds)), [tracks, filterBounds]);
  const selectionData = useMemo(() => boundsToGeoJson(filterBounds), [filterBounds]);
  const hoverData = useMemo(() => pointToGeoJson(hoveredPoint), [hoveredPoint]);
  const trackDataRef = useRef(trackData);
  const arrowDataRef = useRef(arrowData);
  const selectionDataRef = useRef(selectionData);
  const hoverDataRef = useRef(hoverData);
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
    hoverDataRef.current = hoverData;
  }, [hoverData]);

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
      map.addSource(HOVER_SOURCE_ID, {
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
          "line-width": ["case", ["boolean", ["get", "selected"], false], 7, 5],
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
          "line-width": ["case", ["boolean", ["get", "selected"], false], 5, 3.3],
          "line-opacity": ["case", ["boolean", ["get", "selected"], false], 1, 0.88]
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
        id: "hover-point-halo",
        type: "circle",
        source: HOVER_SOURCE_ID,
        paint: {
          "circle-radius": 9,
          "circle-color": "#ffffff",
          "circle-opacity": 0.86
        }
      });
      map.addLayer({
        id: "hover-point-dot",
        type: "circle",
        source: HOVER_SOURCE_ID,
        paint: {
          "circle-radius": 5,
          "circle-color": "#101820",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });

      map.on("mouseenter", "tracks-lines", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "tracks-lines", () => {
        map.getCanvas().style.cursor = selectionModeRef.current ? "crosshair" : "";
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
      updateSource(map, HOVER_SOURCE_ID, hoverDataRef.current);
      setBasemapVisibility(map, basemapIdRef.current);
    });

    mapRef.current = map;

    return () => {
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
    if (!map || !loadedRef.current) {
      return;
    }

    updateSource(map, HOVER_SOURCE_ID, hoverData);
  }, [hoverData]);

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

  const fitBounds = useCallback((bounds: Bounds) => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
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
    if (!request) {
      return;
    }

    if (request.trackId === "__all__") {
      const visibleTracks = tracks.filter((track) => track.visible && (!filterBounds || track.matched));
      const bounds = combineBounds(visibleTracks.map((track) => track.bounds));
      if (bounds) {
        fitBounds(bounds);
      }
      return;
    }

    const track = tracks.find((item) => item.id === request.trackId);
    if (track) {
      fitBounds(track.bounds);
    }
  }, [filterBounds, fitBounds, focusRequest, tracks]);

  useEffect(() => {
    const container = containerRef.current;
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
    <div className="map-shell" ref={containerRef}>
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

function pointToGeoJson(point: TrackPoint | null): GeoJsonData {
  if (!point) {
    return emptyFeatureCollection();
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Point" as const,
          coordinates: [point.lon, point.lat, point.ele ?? 0]
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

function combineBounds(boundsList: Bounds[]) {
  if (!boundsList.length) {
    return undefined;
  }

  return boundsList.reduce<Bounds>(
    (combined, bounds) => ({
      west: Math.min(combined.west, bounds.west),
      south: Math.min(combined.south, bounds.south),
      east: Math.max(combined.east, bounds.east),
      north: Math.max(combined.north, bounds.north)
    }),
    boundsList[0]
  );
}
