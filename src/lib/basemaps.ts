export type BasemapId = "osm" | "osmDark" | "osmHot" | "topo" | "satellite";

export type Basemap = {
  id: BasemapId;
  name: string;
  background: string;
  tiles: string[];
  maxzoom: number;
  attribution: string;
  paint?: {
    saturation?: number;
    contrast?: number;
    brightnessMin?: number;
    brightnessMax?: number;
  };
};

export const BASEMAPS: Basemap[] = [
  {
    id: "osm",
    name: "OSM Standard",
    background: "#c7dde5",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    maxzoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    paint: {
      saturation: -0.18,
      contrast: 0.08,
      brightnessMin: 0.08,
      brightnessMax: 0.96
    }
  },
  {
    id: "osmDark",
    name: "OSM Dark",
    background: "#0b1518",
    tiles: [
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    ],
    maxzoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    paint: {
      saturation: -0.12,
      contrast: 0.02,
      brightnessMin: 0,
      brightnessMax: 1
    }
  },
  {
    id: "osmHot",
    name: "OSM Humanitarian",
    background: "#d9e3dc",
    tiles: ["https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"],
    maxzoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team'
  },
  {
    id: "topo",
    name: "OpenTopoMap",
    background: "#d8e1d5",
    tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
    maxzoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  },
  {
    id: "satellite",
    name: "Satellite",
    background: "#101820",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    maxzoom: 19,
    attribution:
      'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community | Route data from uploaded files'
  }
];

export const DEFAULT_BASEMAP_ID: BasemapId = "osm";
