# No build step

A fair question if you came here from the p5 web editor: can you use this from a plain `<script>` tag, with no imports, no modules, and no bundler?

Short answer: **not for `<P5Canvas>`, and that's inherent rather than an oversight.** But part of that question has a better answer than "no":

- [No build step at all](#no-build-step-at-all) - plain p5 from a CDN, which is genuinely the right tool for a single sketch on a static page, plus the one part of this library that _does_ load straight from a CDN.
- [Global mode to instance mode](#global-mode-to-instance-mode) - why a sketch copied out of the p5 editor doesn't drop straight into a component, and the mechanical change that fixes it.

(This page is about modules and build steps, not about TypeScript. Writing plain JavaScript in Svelte has never required anything special - drop `lang="ts"` from the `<script>` tag and the annotations, and every sample in these docs works as-is. There's a JS/TS toggle on every code block if you want to see them that way.)

## Why the component needs a build step

`<P5Canvas>` is a Svelte component, and the published package ships it as _source_:

```bash
node_modules/svelte-p5/dist/
├── P5Canvas.svelte      # not compiled - this is the .svelte file itself
├── index.js
└── utils/
```

That is the standard way to publish a Svelte library ([`svelte-package`](https://svelte.dev/docs/kit/packaging) does it deliberately) so your app's compiler can inline and optimize the component against your Svelte version. A browser cannot execute a `.svelte` file, so there is no `<script src="svelte-p5.js">` that would make `<P5Canvas>` appear.

We could publish a prebuilt bundle with the Svelte runtime baked in, exposing something like `SvelteP5.mount(el, sketch)`. We deliberately don't, because in a no-build page that function would be a slower spelling of:

```js
new p5(sketch, el);
```

Everything `<P5Canvas>` adds - teardown on unmount, `bind:instance`, the `$state` bridge - only means something inside a component lifecycle. On a static page there is no unmount to clean up after and no reactive UI to bridge to, so the wrapper would be bytes without benefit.

## No build step at all

Here is a complete p5 page. Save it as `index.html`, double-click it, and it runs - no install, no terminal, no bundler.

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>My sketch</title>
		<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
	</head>
	<body>
		<script>
			let x = 200;
			let vx = 3;

			function setup() {
				createCanvas(400, 300);
				noStroke();
			}

			function draw() {
				background(245);
				x += vx;
				if (x - 20 < 0 || x + 20 > width) vx *= -1;
				fill(220, 60, 60);
				circle(x, 150, 40);
			}
		</script>
	</body>
</html>
```

This is p5's **global mode**. When p5 loads it waits for the document, then checks whether you've defined a `setup` or `draw` function on `window` - and if so, constructs a sketch for you automatically. That's why there's no `new p5(...)` anywhere; p5 does it on your behalf.

If this is what you need, stop here. You do not need svelte-p5, and adding a framework to a single static sketch makes it harder to share, not easier.

### Using the utilities without a build step

The part of this library that _isn't_ Svelte does work in a plain page. `svelte-p5/utils` - `hitTest`, `createColorCache`, `createFontAtlas` - is dependency-free ES modules with no Svelte import anywhere, so a CDN can serve it directly to the browser:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
<div id="sketch"></div>
<script type="module">
	import { hitTest, createColorCache } from 'https://esm.sh/svelte-p5/utils';

	const colors = createColorCache();

	new p5((p) => {
		p.setup = () => p.createCanvas(400, 300);

		p.draw = () => {
			p.background(245);
			const hovering = hitTest.circle(p.mouseX, p.mouseY, 200, 150, 80);
			p.fill(colors.get(hovering ? 'on' : 'off', () => (hovering ? '#e11d48' : '#94a3b8')));
			p.circle(200, 150, 80);
		};
	}, document.getElementById('sketch'));
</script>
```

Note this uses instance mode rather than global mode. Inside a module, `function setup() {}` is scoped to the module rather than to `window`, so p5's global-mode detection wouldn't find it - and instance mode is the mode everything else composes with anyway.

One thing that will bite you: **module scripts need a server.** A `<script type="module">` is fetched under CORS rules that the `file://` protocol fails, so unlike the previous example this one won't run by double-clicking. Any static server works:

```bash
npx serve .
```

That's the real tradeoff. The pure global-mode version above runs from a double-click; the moment you want to `import` anything, you need a server. It's also the first step down the road that ends in wanting a build tool.

### One utility that doesn't apply here

`disableFES()` is the exception - importing it into a plain page won't do anything useful, for two separate reasons.

**Timing.** It turns off p5's Friendly Error System by setting a global flag that p5 reads _while it evaluates_. Module scripts are deferred, so by the time your import runs, p5 has already booted and read the flag. Setting it late has no effect.

**You're probably already covered.** On p5 1.x the flag is `IS_MINIFIED`, and the minified CDN build (`p5.min.js`) ships FES already stubbed out - `_validateParameters` is an empty function there. The overhead `disableFES()` exists to remove isn't present in the build a plain page loads. It matters in bundled apps, where `import 'p5'` resolves to the full development build.

On **p5 2.x** the mechanism changed: `IS_MINIFIED` is gone, and FES is controlled by `p5.disableFriendlyErrors` instead. If you're on 2.x and want it off in a plain page, set that after p5 loads:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
<script>
	p5.disableFriendlyErrors = true;
</script>
```

See [recipes/performance.md](./recipes/performance.md) for what FES actually costs and when it's worth turning off at all.

## Global mode to instance mode

The other half of "can I write this the way I write it in the editor" is `setup()` and `draw()` themselves. You can't declare them as globals and hand them to `<P5Canvas>`, and the reason is the same reason p5 exists in two modes at all.

**Global mode** puts every p5 function on `window`. That's what makes `circle(200, 150, 40)` work with no prefix, and it's why only one sketch can exist per page - a second one would fight over the same globals.

**Instance mode** hands your sketch function a p5 object and hangs everything off it. `<P5Canvas>` always uses instance mode, which is what lets you mount several sketches on one page and tear each one down independently.

The conversion is mechanical:

| Global mode                | Instance mode                      |
| -------------------------- | ---------------------------------- |
| `function setup() { ... }` | `p.setup = () => { ... }`          |
| `function draw() { ... }`  | `p.draw = () => { ... }`           |
| `createCanvas(400, 300)`   | `p.createCanvas(400, 300)`         |
| `circle(x, y, d)`          | `p.circle(x, y, d)`                |
| `mouseX`, `mouseY`         | `p.mouseX`, `p.mouseY`             |
| `width`, `height`          | `p.width`, `p.height`              |
| `function mousePressed()`  | `p.mousePressed = () => { ... }`   |
| your own variables         | unchanged - they're already scoped |

The sketch from the top of this page, converted:

```js
const sketch = (p) => {
	let x = 200;
	let vx = 3;

	p.setup = () => {
		p.createCanvas(400, 300);
		p.noStroke();
	};

	p.draw = () => {
		p.background(245);
		x += vx;
		if (x - 20 < 0 || x + 20 > p.width) vx *= -1;
		p.fill(220, 60, 60);
		p.circle(x, 150, 40);
	};
};
```

Every line of your own logic is untouched. Only p5's own calls take a `p.` prefix, and your variables stay exactly where they were.

That function is now portable: pass it to `new p5(sketch, container)` on a plain page, or hand it to `<P5Canvas {sketch} />` in Svelte. Both consume the identical function - see [`docs/examples/00-no-build`](./examples/00-no-build), where `instance-mode.html` runs it twice on one page.

### Why you can't just destructure the prefix away

The obvious next thought is to unpack `p` and get the short names back:

```js
const sketch = (p) => {
	const { circle, background, mouseX } = p; // don't
};
```

Methods survive this, but **live values don't**. `mouseX`, `width`, `frameCount`, and `millis()` are properties p5 updates every frame; destructuring copies the value once and freezes it at whatever it was when the sketch was created. Your mouse-following circle will sit permanently at `(0, 0)`.

You can safely pull out drawing _functions_ if the prefix really bothers you:

```js
const sketch = (p) => {
	const { circle, background, fill } = p; // methods only - fine
	p.draw = () => {
		background(245);
		fill(220, 60, 60);
		circle(p.mouseX, p.mouseY, 40); // live values still need p.
	};
};
```

Honestly, the mixed style is harder to read than a consistent `p.` prefix. Mentioned because it's the first thing people try.

## When Svelte earns its place

Plain p5 is the better choice for a single sketch on a static page, an assignment, or a sketch you want to share as one file. Reach for svelte-p5 when you hit one of these:

- **UI controls driving the sketch.** Sliders, color pickers, and toggles wired to sketch parameters without hand-writing DOM listeners - see [state bridges](./bridges.md).
- **More than one sketch on a page.** Global mode allows exactly one; instance mode plus components makes several routine.
- **Sketches that mount and unmount.** Route changes, tabs, `{#if}` toggles. Without `remove()` each cycle leaves a p5 instance running - see [cleanup](./recipes/cleanup.md).
- **Sketches driven by data your app already has.** Fetched, filtered, or user-uploaded data flowing into the sketch as it changes - see [data-driven viz](./recipes/data-driven-viz.md).

If none of those apply, the plain HTML file at the top of this page is not a lesser option. It's the correct one.

## Next steps

- [`docs/examples/00-no-build`](./examples/00-no-build) - three HTML files, no install; two of them open by double-clicking.
- [Getting started](./getting-started.md) - when you're ready for the Svelte side.
- [p5's own guide to global and instance mode](https://github.com/processing/p5.js/wiki/Global-and-instance-mode) - the upstream reference.
