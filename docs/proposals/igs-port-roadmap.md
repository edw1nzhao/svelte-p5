# Proposal: features surfaced by the IGS port

Status: proposal — none of these are committed work.

Porting IGS (a WEBGL space-time visualization tool with video sync, a zoomable
timeline, floorplan images, and an on-demand render loop) onto svelte-p5
surfaced a set of candidate features. The blockers were implemented
(`SketchFn<Ext>`/`ExtendedP5<Ext>`, `Sketch` `onResize` + numeric `hidpi`,
`@neodrag/core` dependency fix, WEBGL recipe). Everything below was judged
_below the implement-now bar_ — the thin-wrapper philosophy ("p5 draws pixels,
Svelte does everything else") says no until real consumer duplication proves
otherwise. Recorded here so the reasoning isn't lost.

## 1. `createRenderGate` (core)

A tiny orchestrator formalizing the noLoop-gated wake pattern
([data-driven-viz.md](../recipes/data-driven-viz.md#the-loop-gated-variant)):
`attach(p)` / `requestRender()` / `settle(predicate)`. Today this is a one-line
`instance.loop()` at each call site plus a gate at the end of `draw`.

**Adopt when:** two or more consumers independently grow debounce logic or
"who woke the loop" bookkeeping around the raw pattern.

## 2. Timeline view-window / zoom-domain contract (components or viz)

`TimelineScrubber`/`TimelineTrack` model the full duration as the track. IGS's
timeline has a _zoomable view window_ (drag-to-zoom region, pan, zoom-to-fit)
that doubles as the visualization's x-axis domain — the sketch maps data time
through the view window to pixels every frame. That needs: a view-window state
(`viewStart`/`viewEnd`) on the timeline components, pixel-bounds export (where
the track's usable band sits, so canvas drawing can align with it), and
custom render-layer injection (IGS draws an activity-density gradient into its
track). This is the largest genuinely generalizable gap the port found.

**Adopt when:** designing it once IGS's Phase-3 timeline evaluation settles the
required contract; IGS keeps its custom timeline until then.

## 3. WebGL context-loss resilience (core)

`<P5Canvas>` could listen for `webglcontextlost`/`webglcontextrestored` and
either surface an `onContextLost` callback or auto-remount. Would supersede the
manual `{#key}` + `WEBGL_lose_context` recipe ([webgl.md](../recipes/webgl.md))
for the Safari heavy-data case.

**Adopt when:** context loss is observed in the wild beyond the deliberate
Safari workaround, or a second consumer needs the recipe.

## 4. `recreateKey` prop on `Sketch` (components)

Sugar over the `{#key}` recreation pattern. Zero correctness gain — `{#key}` is
idiomatic Svelte and the teardown path is already race-safe.

**Adopt when:** multiple consumers duplicate the recipe verbatim and get it
wrong (e.g. forget `loseContext`).

## 5. Asset preload helper (core utils)

Promise-based `loadImages(p, urls)` with aggregate progress/error handling.
Raw `p.loadImage(url, cb, errCb)` served IGS's floorplan + Mapbox images fine.

**Adopt when:** a consumer needs coordinated multi-asset loading states
(spinners over N images) badly enough that everyone's writing the same
Promise.all wrapper.

## 6. p5 2.x compatibility audit

The peer range already allows `<3`, but p5 2.x changes `setup` to async and
reworks the WEBGL renderer — `P5Canvas`'s synchronous `onReady` contract and
`Sketch`'s ready-time sizing both assume 1.x timing.

**Adopt when:** scheduling the 2.x support release; this is a when-not-if.

## Explicitly not planned (philosophy)

- Wrapped/typed p5 event props (mouse/touch/key) — assign `p.*` handlers
  directly; `instance.remove()` cleans them up.
- p5-side video/capture integration — video is an HTML `<video>` synced via
  `createMediaSync`/`createMediaPlayback`; p5 draws pixels.
- Canvas-drawn UI, dock managers, store abstractions — Svelte owns UI and
  state; see [architecture.md](../architecture.md).
