# Architecture

The library is built in layers, and you should be able to drop in at any of them and have the ones below behave sanely.

## 1. Primitives - `svelte-p5`

- `<P5Canvas>` mounts a p5 instance, exposes it via `bind:instance`, calls `remove()` on unmount. Dynamically imports p5 on the client so SSR builds don't choke.
- `createP5Bridge(initial)` wraps an object in a `$state` proxy and returns it under `.state`.
- `utils/` has `disableFES`, `createColorCache`, `createFontAtlas`, `hitTest`. Re-exported from the main entry.

Use this layer alone when you know p5 and don't want any abstraction between your sketch and the canvas.

## 2. Components - `svelte-p5-components`

Chrome and overlays for canvas apps. Nothing in here knows what's being visualised; it's all layout and input plumbing.

- `<Sketch>` wraps `<P5Canvas>` with a `ResizeObserver` and auto `pixelDensity`.
- `<CanvasFrame>` is the layout shell: snippet slots for top / bottom / leftRail / rightRail / canvas / overlay with pointer-events discipline baked in.
- `<SplitPane>` is the two-panel resizable split (horizontal or vertical).
- `<HoverTooltip>` is an edge-aware floating tooltip anchored to a screen point.
- `<EntityToggleList>` is the speaker/actor/series toggle panel with colored swatches and optional grouping.
- `<TimelineTrack>` / `<TimelineScrubber>` / `createMediaSync` cover scrubbable timelines, with segments, view windows, hover previews, and honest disclosure when video playback overrides the speed multiplier.
- `<FPSMonitor>` and `<SketchDebug>` are rAF-driven debug overlays.
- `<DraggableWindow>` and `<DraggableSketch>` are floating-panel primitives (neodrag-powered, with `axis`, `grid` and `threshold` props).
- `<ActivityBar>`, `<SidePanel>` and `<ContextMenu>` are the remaining app-shell pieces, and `createMediaPlayback` drives a video from a timeline.

Use this layer when you're building a real UI around sketches and don't want to rewrite ResizeObservers, drag logic, resize coordination, scrub plumbing, or FPS overlays.

## 3. Viz contract - `svelte-p5-viz`

The interface between chrome and the visualizations it hosts. Added once a handful of consumer apps all grew the same informal shape for their viz panels — this package formalises it.

- `VizPanel<TData, TConfig>` is the renderer contract: a `type` string, a `defaultConfig`, and a `render(ctx, data, config)` method that returns a `PanelResult`.
- `createPanelRegistry()` is the type→impl lookup a scene runner uses to resolve a `PanelInstance` to a live panel.
- `SceneConfig` is the JSON-serialisable shape (panels plus a single / split / grid layout) that describes a multi-viz dashboard.
- `createSceneState()` is the Svelte 5 `$state` helper for chrome-level shared hover and highlight ids.

No visualization code ships here on purpose — that belongs in apps or in a future viz-pack. This package is the contract the studio (see §5) will be designed against.

## 4. Composition - your app

Example 03 is a reasonable template: a toolbar with global controls, three floating sketches, a reactive class in `.svelte.ts` as the single source of truth. The library doesn't ship app-level code on purpose.

An app that adopts `svelte-p5-viz` typically looks like:

- a `PanelRegistry` registered at boot with the app's panel implementations,
- a `SceneConfig` (hand-written JSON, URL-encoded state, or a future studio export),
- a scene runner that resolves each `PanelInstance` to a `VizPanel` and calls `render` inside the p5 draw loop.

## 5. No-code studio (future)

A visual editor that lets researchers and educators compose scenes without writing code is the longer-term direction. It will live in its own repo, not as a library, and will depend on layers 1-3. See [`no-code-product.md`](./no-code-product.md).

## The one rule

p5 draws pixels, Svelte does everything else.

- UI chrome (toolbars, modals, sidebars, windows) is Svelte components and CSS.
- Visualization content lives inside a `<P5Canvas>` or `<Sketch>`.
- Shared state is `$state`, either via `createP5Bridge` or a reactive class.
- Layout is CSS Grid or Flexbox, never hand-computed inside a canvas.

Apps that cross this boundary - drawing buttons in the canvas, simulating text inputs with `p.text`, computing layout in pixels - are the ones that feel janky. The browser is already excellent at the everything-else part; let it do that.

## What's deliberately missing

- No store API. Svelte 5's runes replace `writable()`.
- No data-viz primitives (scales, axes, tooltips). `d3-scale` is one `pnpm add` away and does the job better than anything this library could ship. `svelte-p5-viz` is only the panel contract, not a chart library.
- No dock manager. `<DraggableWindow>` handles floating panels; if you want VSCode-style splits and tabs, use [dockview](https://dockview.dev/).
- No canvas-based UI. If it needs accessibility, focus, or input, it's HTML.

## Versioning

`svelte-p5` and `svelte-p5-components` follow semantic versioning: within a major, minor and patch releases never break a documented API, and anything that does carries `BREAKING CHANGE:` in its commit so release-please bumps the major. `svelte-p5-viz` is still `0.x` and unstable by design; pin an exact version. See [Upgrading](./upgrading.md) for what each release means for you.
