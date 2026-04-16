# 03 - Draggable dashboard

Three `<DraggableSketch>` windows and one `<DraggableWindow>` docs panel, all sharing one reactive class. The template for a complex visualization suite with floating, rearrangeable panels.

## Run

```bash
pnpm install
pnpm --filter @svelte-p5-example/03-draggable-dashboard dev
```

`http://localhost:5173`.

## What to notice

**Reactive class pattern** (`src/sharedState.svelte.ts`). A class with `$state` fields replaces the Svelte-4 `writable()` store. Works across modules because the file ends in `.svelte.ts`.

**Sketches are plain TypeScript** (`src/sketches.ts`). They import `dashboard` directly and read live values each frame. No subscriptions.

**Panels are Svelte state, not p5 state.** Closing a window removes the `<DraggableSketch>` via `{#if}`; the wrapper calls `instance.remove()` cleanly. No leak, no interference with the other sketches.

**The "custom docs" pattern.** One `<DraggableWindow>` contains arbitrary HTML. Put timelines, inspectors, notes, video players - anything you'd want floating - in one of these and skip the canvas entirely.

**Toolbar is pure CSS + Svelte.** Global `hue`, `density`, `paused` controls flow into every sketch through the shared class. Same architecture as any app with a persistent chrome layer on top of viewport content.

## Extending

Swap the three sketches for real visualizations. Extend the `dashboard` class with per-panel config. If you eventually need tabbed docking (VSCode-style), the next step is [dockview](https://dockview.dev/) - `<DraggableWindow>` is the right primitive for floating panels, not the right one for persistent docked layouts.
