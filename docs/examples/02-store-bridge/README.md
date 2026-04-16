# 02 — State bridge

Svelte sliders drive a p5 particle field. All state lives in a single `createP5Bridge` object. Adds three things on top of example 01:

- `createP5Bridge` — a `$state` proxy both sides read and write.
- `disableFES()` — called once at startup for production performance.
- `<FPSMonitor>` — rAF-driven FPS readout from the components package.
- `bind:instance` — how the parent gets a reference to the p5 instance.

## Run

```bash
pnpm install
pnpm --filter @svelte-p5-example/02-store-bridge dev
```

`http://localhost:5173`.

## What to notice

No stores. `bridge.state.*` is a `$state` proxy; both sides mutate directly. This is the Svelte 5 default — legacy `writable()` exists for cross-module globals and interop, not for new code.

The sketch reads live values every frame. `p.draw` closes over `bridge` and reads `bridge.state.particleCount` and friends; moving a slider shows up on the next frame with no effect or subscription.

It's bidirectional. `p.mousePressed` writes `bridge.state.clicks`, and the UI updates the moment the click fires.
