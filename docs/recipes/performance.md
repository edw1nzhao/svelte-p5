# Performance

The real p5 perf traps, ordered by how much impact they have. Each one is tied to a specific place in p5's source.

## 1. Don't `loadFont()` unless you must

```ts
// bad - every p.text() call path-renders glyphs via OpenType.js
p.font = p.loadFont('/fonts/MyFont.ttf');
p.textFont(p.font);

// good - p.text() uses native canvas fillText(), 10-100× faster
p.textFont('MyFont, system-ui, sans-serif');
// and serve MyFont via CSS @font-face in your index.html
```

p5's `_renderText` ([`src/core/p5.Renderer2D.js:1212-1243`](https://github.com/processing/p5.js/blob/main/src/core/p5.Renderer2D.js)) has two branches. System fonts go through native `drawingContext.fillText`. Loaded OTF/TTF fonts go through OpenType.js, which decomposes every glyph into Bezier curves on every call. A word cloud with 500 labels runs that 500 times per frame.

If you need a specific loaded font, pre-render a fixed vocabulary with `createFontAtlas` (see below) so each glyph is path-rendered once.

## 2. Disable FES in production

```ts
import { disableFES } from 'svelte-p5';
disableFES(); // before any new p5(...)
```

p5's Friendly Error System validates arguments on every `map()`, `fill()`, `stroke()`, `text()` call via deep type checking and Levenshtein-distance typo detection ([`src/core/friendly_errors/fes_core.js:41-45`](https://github.com/processing/p5.js/blob/main/src/core/friendly_errors/fes_core.js)). Setting `window.IS_MINIFIED = true` short-circuits it. Worth 1-5% CPU in production.

## 3. Cache colors, don't call `color()` in loops

```ts
// bad - allocates a p5.Color per particle per frame
for (const pt of particles) {
	p.fill(p.color(pt.hue, 80, 90));
	p.circle(pt.x, pt.y, 10);
}

// good - compute once, reuse
import { createColorCache } from 'svelte-p5';
const colors = createColorCache<string>();
for (const pt of particles) {
	p.fill(colors.get(pt.id, () => `hsl(${pt.hue}, 80%, 60%)`));
	p.circle(pt.x, pt.y, 10);
}

// better - skip p5's color parser, pass CSS strings straight through
for (const pt of particles) {
	p.fill(pt.cssColor);
	p.circle(pt.x, pt.y, 10);
}
```

`p.color()` allocates a `p5.Color`, a typed array, and runs regex on the input - around 5-10µs each. Thousands of particles means milliseconds of GC pressure per frame. Canvas 2D accepts CSS strings directly, so you can sidestep the parser entirely.

## 4. `drawingContext` in hot loops

```ts
// bad - p5 wrapper + FES per call, thousands of times per frame
for (const w of words) {
	p.fill(w.color);
	p.text(w.label, w.x, w.y);
}

// good - raw Canvas 2D
const ctx = p.drawingContext as CanvasRenderingContext2D;
for (const w of words) {
	ctx.fillStyle = w.color;
	ctx.fillText(w.label, w.x, w.y);
}
```

p5 exposes the raw `CanvasRenderingContext2D` as `drawingContext` ([`src/core/p5.Renderer2D.js:17-18`](https://github.com/processing/p5.js/blob/main/src/core/p5.Renderer2D.js)). Skipping the wrapper saves real milliseconds in inner loops. Use sparingly - the whole point of p5 is the nicer API.

## 5. Font atlas for fixed vocabularies

If `loadFont()` is unavoidable and you have a known set of strings (speaker names, axis labels, category tags):

```ts
import { createFontAtlas } from 'svelte-p5';

let atlas: ReturnType<typeof createFontAtlas> | null = null;

p.setup = () => {
	// ... createCanvas, loadFont, textFont ...
	atlas = createFontAtlas(p, speakerNames, { fontSize: 14, fill: '#111' });
};

p.draw = () => {
	for (const row of rows) {
		atlas?.draw(row.speaker, row.x, row.y);
	}
};
```

Each string is path-rendered once to an offscreen buffer, then composited with `p5.image()` every frame. Trades memory for speed - roughly 20× on label-heavy visualizations.

## 6. `createGraphics()` once, in `setup`

An offscreen buffer allocates ~200 method bindings per instance ([`src/core/p5.Graphics.js:116-124`](https://github.com/processing/p5.js/blob/main/src/core/p5.Graphics.js)). Create it once, reuse it, re-render its contents only when the data changes.

## 7. Set `colorMode` in `setup`, not `draw`

Mode changes are cheap individually but confuse p5's internal caching. Pick RGB or HSB and stick with it.

## Profiling

Measure before you optimize. DevTools → Performance → record one second of animation, then look for:

- Long `FunctionCall` entries in the draw path - too much per-frame work.
- Frequent Minor GC events - allocation in the hot loop (colors, objects, arrays).
- `drawingContext.fill` dominating - time to skip the wrapper.
- `_renderPath` dominating - you're in the `loadFont()` slow path. Fix item 1 first.

Item 1 usually accounts for most of the problem when it applies at all.
