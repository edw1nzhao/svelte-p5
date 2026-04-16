# Architecture

The library has three layers. You should be able to drop in at any of them and have the one below behave sanely.

## 1. Primitives — `svelte-p5`

- `<P5Canvas>` mounts a p5 instance, exposes it via `bind:instance`, calls `remove()` on unmount. Dynamically imports p5 on the client so SSR builds don't choke.
- `createP5Bridge(initial)` wraps an object in a `$state` proxy and returns it under `.state`.
- `utils/` has `disableFES`, `createColorCache`, `createFontAtlas`, `hitTest`. Re-exported from the main entry.

Use this layer alone when you know p5 and don't want any abstraction between your sketch and the canvas.

## 2. Components — `svelte-p5-components`

- `<Sketch>` wraps `<P5Canvas>` with a `ResizeObserver` and auto `pixelDensity`.
- `<FPSMonitor>` and `<SketchDebug>` are rAF-driven overlays.
- `<DraggableWindow>` is a floating panel (neodrag-powered) with focus-to-front, viewport clamping, and a plugins escape hatch.
- `<DraggableSketch>` is `<DraggableWindow>` plus `<Sketch>`.

Use this layer when you're building a real UI around sketches and don't want to rewrite ResizeObservers, drag logic, or FPS overlays.

## 3. Composition — your app

Example 03 is a reasonable template: a toolbar with global controls, three floating sketches, a reactive class in `.svelte.ts` as the single source of truth. The library doesn't ship app-level code on purpose.

## The one rule

p5 draws pixels, Svelte does everything else.

- UI chrome (toolbars, modals, sidebars, windows) is Svelte components and CSS.
- Visualization content lives inside a `<P5Canvas>` or `<Sketch>`.
- Shared state is `$state`, either via `createP5Bridge` or a reactive class.
- Layout is CSS Grid or Flexbox, never hand-computed inside a canvas.

Apps that cross this boundary — drawing buttons in the canvas, simulating text inputs with `p.text`, computing layout in pixels — are the ones that feel janky. The browser is already excellent at the everything-else part; let it do that.

## What's deliberately missing

- No store API. Svelte 5's runes replace `writable()`.
- No data-viz primitives (scales, axes, tooltips). `d3-scale` is one `pnpm add` away and does the job better than anything this library could ship. A dedicated `svelte-p5-viz` package may land if demand shows up.
- No dock manager. `<DraggableWindow>` handles floating panels; if you want VSCode-style splits and tabs, use [dockview](https://dockview.dev/).
- No canvas-based UI. If it needs accessibility, focus, or input, it's HTML.

## Versioning

0.x is unstable. Minor bumps can break public API. Anything that does will have `BREAKING CHANGE:` in its commit so release-please bumps the major line when we eventually reach 1.0. New features are additive; deprecations get a minor bump with a warning before they disappear.
