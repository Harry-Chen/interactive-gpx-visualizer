# Interactive GPX Visualizer

[![CI](https://github.com/Harry-Chen/interactive-gpx-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/Harry-Chen/interactive-gpx-visualizer/actions/workflows/ci.yml)

Pure front-end GPX/FIT route visualizer for local use and Cloudflare Pages.

Public site: <https://gpx.harrychen.xyz>

This project was written by Codex, an AI coding agent, through iterative prompts and human review.

The project is inspired by [GPX Studio](https://github.com/gpxstudio/gpxstudio.github.io), while adding FIT support, local gzip import, multi-track management, and an important geographical range query workflow for finding tracks that pass through a selected area.

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

## Deployment

The GitHub Actions workflow in `.github/workflows/ci.yml` runs `pnpm lint` and `pnpm build`.
Pushes to `master` deploy the built `dist` directory to the Cloudflare Pages project `interactive-gpx-visualizer`.
Pull requests run validation without deploying.

## Notes

Uploaded files stay in the browser. The spatial filter uses a client-side geohash index plus exact segment checks. Rust/WASM is intentionally deferred until real-world imports show that parsing or spatial filtering has become a measurable bottleneck.

## License

MIT
