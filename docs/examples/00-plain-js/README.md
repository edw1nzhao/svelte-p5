# 00 - Plain JavaScript, no build step

Three HTML files, no `package.json`, no install step. This example exists to answer a specific question: **can you use any of this without imports, modules, or a bundler?**

The honest answer, demonstrated in order:

| File                 | What it shows                                         | How to run     |
| -------------------- | ----------------------------------------------------- | -------------- |
| `index.html`         | Plain p5 in global mode - no svelte-p5 at all         | Double-click   |
| `instance-mode.html` | The same sketch as a portable function, running twice | Double-click   |
| `with-utils.html`    | svelte-p5's utilities imported from a CDN             | Needs a server |

## Run

`index.html` and `instance-mode.html` need nothing — open them in a browser directly from your file manager.

`with-utils.html` uses `<script type="module">`, which browsers refuse to load over `file://`. Serve the folder:

```bash
npx serve docs/examples/00-plain-js
```

## What it shows

**`index.html` — global mode.** The p5 web editor's default. You declare `setup()` and `draw()` as globals, and p5 finds them on `window` after the document loads and constructs the sketch for you. One script tag is the entire toolchain.

If this covers your needs, it's the right answer. A single sketch on a static page does not benefit from a framework.

**`instance-mode.html` — the conversion.** The same sketch, rewritten as a function that receives its p5 instance. Your own variables don't move; only p5's calls take a `p.` prefix. Two things become possible immediately:

- Two sketches on one page. Global mode allows exactly one, because there's only one `window` to hang `setup`/`draw` off of.
- The sketch function is now parameterized, and is exactly the shape `<P5Canvas {sketch} />` consumes. The same function moves into Svelte unmodified — compare with [`01-basic`](../01-basic).

**`with-utils.html` — the part of svelte-p5 that works here.** `svelte-p5/utils` (`hitTest`, `createColorCache`, `createFontAtlas`) is dependency-free ES modules with no Svelte import, so a CDN serves it straight to the browser. The `<P5Canvas>` component can't work this way — it ships as `.svelte` source that needs a compiler — but these helpers can.

## Next

- [Plain JavaScript and no build step](../../plain-js.md) — the full write-up, including the global → instance conversion table.
- [`01-basic`](../01-basic) — the same sketch inside Svelte, with lifecycle handled for you.
