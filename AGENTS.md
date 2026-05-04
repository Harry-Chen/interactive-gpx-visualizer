# AGENTS.md

## Project

This is a pure front-end GPX/FIT route visualizer intended for local use and Cloudflare Pages. Uploaded files are parsed entirely in the browser and should not be sent to a server.

The project is MIT licensed and the README states that it was written by Codex, an AI coding agent, through iterative prompts and human review. The app is inspired by GPX Studio and extends the idea with FIT support and geographical range query workflows.

## Commands

- Install dependencies with `pnpm install`.
- Run locally with `pnpm dev`.
- Validate with `pnpm lint` and `pnpm build`.
- Cloudflare Pages should build with `pnpm build` and publish `dist`.
- Vite uses `base: "./"` so production assets are emitted with relative URLs and the built app can be served from any path prefix.
- CI lives in `.github/workflows/ci.yml`. It uses pnpm + Node, runs lint/build, uploads the `dist` artifact, and deploys pushes to `master` to the Cloudflare Pages project `interactive-gpx-visualizer`.

## Architecture Notes

- The map is implemented with MapLibre GL in globe projection using raster base maps. Base map definitions live in `src/lib/basemaps.ts`; the MapLibre style assembly lives in `src/lib/mapStyle.ts`. The OSM dark basemap uses CARTO Dark Matter raster tiles, which are based on OpenStreetMap data and require both OpenStreetMap and CARTO attribution.
- Map rendering lives in `src/components/MapView.tsx`. The MapLibre container is nested inside `.map-shell` so React-owned overlays such as the chart-hover marker and drag rectangle can sit above the canvas reliably.
- Selected tracks are emphasized with dedicated MapLibre line layers (`tracks-selected-halo`, `tracks-selected-casing`, `tracks-selected-line`) instead of relying only on larger line width.
- Theme mode support lives in `src/lib/theme.ts` and is controlled from the right-side toolbar. Supported modes are `system`, `light`, and `dark`; the preference is persisted in localStorage, while `system` follows `prefers-color-scheme`.
- Default UI language is detected from `navigator.languages`; use Chinese only for browser languages starting with `zh`, otherwise default to English.
- UI language preference is persisted in localStorage. Parsed track workspace snapshots are persisted in IndexedDB via `src/lib/workspaceStore.ts` so accidental reloads or development remounts do not discard uploaded route data; this still stays entirely in the browser.
- GPX and FIT inputs are normalized into the shared `Track` / `TrackPoint` model in `src/types.ts`.
- GPX parsing lives in `src/lib/parsers.ts` via `fast-xml-parser`.
- FIT parsing uses `@garmin/fitsdk` and is dynamically imported so the large FIT profile table is not part of the initial app chunk.
- Drag/drop import, recursive folder traversal, and supported extension filtering live in `src/lib/fileDrop.ts`. Supported file extensions include `.gpx`, `.fit`, `.gpx.gz`, and `.fit.gz`.
- Charts are split into `src/components/MetricsCharts.tsx` and lazy-loaded from `MetricsPanel`.
- Chart hover state is shared across stacked charts and sent to `MapView` through a command-style callback instead of `App` React state. `MapView` updates the tracker point directly through a small MapLibre circle layer, avoiding hover-driven re-renders of the chart tree.
- Spatial filtering and geographical range queries use a geohash candidate pass in `src/lib/geohash.ts`, then exact route/selection intersection checks in `src/lib/geo.ts`. Do not rely on geohash alone for correctness.
- Map focus requests use a nonce and are consumed once in `MapView`; keep that behavior so old "focus all" requests do not replay after unrelated track state updates.
- Focus bounds are calculated from track points using a shortest-longitude-arc helper to avoid jumps near the 0-degree meridian for antimeridian or wide-spanning tracks.
- Build metadata is injected in `vite.config.ts` as `__APP_VERSION__` from `git describe --tags --always --dirty` and `__BUILD_DATE__` from the build timestamp. The brand bar displays this label so deployed builds are identifiable.

## Implementation Guidance

- Prefer browser-only libraries and avoid server/runtime dependencies.
- Keep user file contents local to the browser.
- Use existing model helpers before adding duplicate parsing, stats, or geometry logic.
- Keep UI dense and tool-like; this is an application, not a marketing landing page.
- Rust/WASM is intentionally deferred. Introduce it only after profiling shows parsing or spatial filtering is a real bottleneck with large route collections.
- Do not commit `node_modules`, `dist`, local environment files, or Cloudflare generated state.
