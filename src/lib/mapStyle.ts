import type { StyleSpecification } from "maplibre-gl";

export const mapStyle: StyleSpecification = {
  version: 8,
  projection: {
    type: "globe"
  },
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: "earth-water",
      type: "background",
      paint: {
        "background-color": "#c7dde5"
      }
    },
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -0.18,
        "raster-contrast": 0.08,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.96
      }
    }
  ]
};
