# Interactive GPX Visualizer

Pure front-end GPX/FIT route visualizer for local use and Cloudflare Pages.

## Stack

- Vite + React + TypeScript
- pnpm
- MapLibre GL with OSM raster tiles and globe projection
- Garmin FIT JavaScript SDK
- fast-xml-parser for GPX
- Recharts for route metrics

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

For Cloudflare Pages, use `pnpm build` and publish `dist`.

## Notes

Uploaded files stay in the browser. The spatial filter uses a client-side geohash index plus exact segment checks. Rust/WASM is intentionally deferred until real-world imports show that parsing or spatial filtering has become a measurable bottleneck.
