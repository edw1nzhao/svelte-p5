# 01 — Basic sketch

The smallest `<P5Canvas>` setup: a sketch function and the component. No state, no UI, no bridge. Start here.

## Run

From the repo root:

```bash
pnpm install
pnpm --filter @svelte-p5-example/01-basic dev
```

Then open `http://localhost:5173`.

## What it shows

The sketch receives a p5 instance (`p`) and assigns `p.setup` / `p.draw` on it. This is instance mode, the correct way to embed p5 in a component framework.

`<P5Canvas>` handles mount and cleanup. When the component unmounts (route change, HMR, `{#if}` toggle), it calls `instance.remove()`. No leaked canvases.

p5 is dynamically imported inside the wrapper so SSR builds don't explode.
