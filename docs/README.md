# Documentation

- **[Getting started](./getting-started.md)** - install, first sketch, the three layers
- **[Architecture](./architecture.md)** - the layering philosophy, when to use what
- **Recipes** - focused how-tos
  - [Migration from `p5-svelte`](./recipes/migration-from-p5-svelte.md) - the 10-minute port
  - [Performance](./recipes/performance.md) - the `loadFont()` trap, FES, color caching, font atlas, `drawingContext`
  - [Cleanup & lifecycle](./recipes/cleanup.md) - why `p5-svelte` leaks and how `<P5Canvas>` doesn't
  - [HiDPI / retina](./recipes/hidpi.md) - `pixelDensity`, `<Sketch>`, and when to pin it
- **[Examples](./examples/)** - runnable demos
  - [`01-basic`](./examples/01-basic) - the smallest possible `<P5Canvas>` setup
  - [`02-store-bridge`](./examples/02-store-bridge) - `createP5Bridge` with UI controls
  - [`03-draggable-dashboard`](./examples/03-draggable-dashboard) - multiple floating sketches sharing state

API docs live in each package's README:

- [`svelte-p5`](../packages/core/README.md)
- [`svelte-p5-components`](../packages/components/README.md)
