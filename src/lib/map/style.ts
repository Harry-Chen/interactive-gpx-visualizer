import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import { BASEMAPS, DEFAULT_BASEMAP_ID } from "./basemaps";

export const mapStyle: StyleSpecification = {
  version: 8,
  projection: {
    type: "globe"
  },
  sources: Object.fromEntries(
    BASEMAPS.map((basemap) => [
      basemap.id,
      {
        type: "raster",
        tiles: basemap.tiles,
        tileSize: 256,
        maxzoom: basemap.maxzoom,
        attribution: basemap.attribution
      }
    ])
  ) as StyleSpecification["sources"],
  layers: [
    {
      id: "earth-water",
      type: "background",
      paint: {
        "background-color": "#c7dde5"
      }
    },
    ...BASEMAPS.map<LayerSpecification>((basemap) => ({
      id: `basemap-${basemap.id}`,
      type: "raster" as const,
      source: basemap.id,
      layout: {
        visibility: basemap.id === DEFAULT_BASEMAP_ID ? "visible" : "none"
      },
      paint: {
        "raster-saturation": basemap.paint?.saturation ?? 0,
        "raster-contrast": basemap.paint?.contrast ?? 0,
        "raster-brightness-min": basemap.paint?.brightnessMin ?? 0,
        "raster-brightness-max": basemap.paint?.brightnessMax ?? 1
      }
    }))
  ]
};
