# Documentation

- **[Getting started](./getting-started.md)** - install, first sketch, the three layers
- **[No build step](./no-build-step.md)** - script tags and CDNs, what works without a bundler, and the global → instance conversion
- **[Architecture](./architecture.md)** - the layering philosophy, when to use what
- **[State bridges](./bridges.md)** - `$state`, `createP5Bridge`, or a reactive class
- **[Sketch context](./sketch-context.md)** - `getSketchContext()` and overlays inside the canvas
- **[On-demand rendering](./on-demand-rendering.md)** - the `loop` prop, `invalidate()`, measured idle savings
- **[Exporting images and frames](./export.md)** - `exportCanvas` at print sizes, `stepFrames`, WEBGL, `<ExportButton>`
- **[The `addons` prop](./addons.md)** - registering p5 2 add-ons, and what p5 cannot scope per sketch
- **[TypeScript](./typescript.md)** - which p5 types to install, typing sketches and bridge state
- **[Wrapper behavior comparison](./perf-comparison.md)** - measured differences from `p5-svelte`
- **[p5 1 to 2 pitfalls](./p5-2-pitfalls.md)** - async `setup`, the `width`/`height` getters, `pixelDensity`, add-on status on p5 2
- **[Upgrading](./upgrading.md)** - per-version notes and the compatibility matrix
- **Recipes** - focused how-tos
  - [Migration from `p5-svelte`](./recipes/migration-from-p5-svelte.md) - the 10-minute port
  - [Migration from `@p5-wrapper/react`](./recipes/migration-from-react-p5-wrapper.md) - `updateWithProps`, `updater` and plugins mapped to the bridge
  - [Loading p5 add-ons](./recipes/loading-addons.md) - `registerAddon`, the global `p5`, p5.brush and p5.sound
  - [Parameter panels](./recipes/parameter-panels.md) - Tweakpane controls bound to bridge state, presets, URL state
  - [Performance](./recipes/performance.md) - the `loadFont()` trap on p5 1.x, FES, color caching, font atlas, `drawingContext`
  - [Interaction](./recipes/interaction.md) - mouse, touch, hit-testing, syncing hover with UI
  - [Shared state](./recipes/shared-state.md) - one reactive class across several sketches
  - [Data-driven viz](./recipes/data-driven-viz.md) - loading data, master clocks, on-demand redraws
  - [Syncing to video](./recipes/media-sync.md) - `createMediaSync` and media ports
  - [Cleanup & lifecycle](./recipes/cleanup.md) - why `p5-svelte` leaks and how `<P5Canvas>` doesn't
  - [HiDPI / retina](./recipes/hidpi.md) - `pixelDensity`, `<Sketch>`, and when to pin it
  - [WEBGL sketches](./recipes/webgl.md) - origin recentering, resize semantics, `smooth()`/`setAttributes` context rebuilds, `{#key}` canvas recreation
- **[Examples](./examples/)** - runnable demos
  - [`00-no-build`](./examples/00-no-build) - no install, no bundler: plain p5 HTML files
  - [`01-basic`](./examples/01-basic) - the smallest possible `<P5Canvas>` setup
  - [`02-store-bridge`](./examples/02-store-bridge) - `createP5Bridge` with UI controls
  - [`03-draggable-dashboard`](./examples/03-draggable-dashboard) - multiple floating sketches sharing state

API docs live in each package's README:

- [`svelte-p5`](../packages/core/README.md)
- [`svelte-p5-components`](../packages/components/README.md)
- [`svelte-p5-viz`](../packages/viz/README.md)
