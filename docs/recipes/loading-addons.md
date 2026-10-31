# Loading p5 add-ons

Add-on loading is the most repeated question in p5 wrapper trackers ([react#11](https://github.com/P5-wrapper/react/issues/11), [react#505](https://github.com/P5-wrapper/react/issues/505), [p5-svelte#96](https://github.com/tonyketcham/p5-svelte/issues/96)). Most published add-ons register themselves when they load, so you load the add-on yourself before the sketch mounts, and the sketch uses it through the instance. This page shows how, for a bundler (Vite, SvelteKit) and p5 2.x. For an add-on function you hold yourself, `svelte-p5` 1.2 adds an [`addons` prop](../addons.md) that registers it once before the sketch is created.

## Two kinds of add-on

| kind                                             | how it attaches to p5                                           | what you must do                                                |
| ------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------- |
| classic script (`p5.sound` 0.4, older libraries) | assigns to `p5.prototype` using a bare global `p5`              | set `globalThis.p5` before importing it                         |
| `registerAddon` add-on (p5 2)                    | calls `p5.registerAddon(function (p5, fn, lifecycles) { ... })` | call `registerAddon` yourself, or give the add-on a global `p5` |

p5 2 keeps the registry on the class, so every sketch constructed after registration gets the add-on, including other sketches on the same page. Load add-ons before the first `<P5Canvas>` mounts.

p5 2's ES module does not set `window.p5`, so bundled apps have to do it.

## A loader that is safe for SSR

The loader runs only in the browser, so call it from `onMount` and never at module level:

```ts
// addons.ts
export async function withGlobalP5<T>(load: () => Promise<T>): Promise<T> {
	const { default: p5 } = await import('p5');
	(globalThis as { p5?: unknown }).p5 = p5;
	return load();
}
```

`import('p5')` resolves to the same module `<P5Canvas>` loads, so the add-on registers on the class your sketch is built from. A module loads once, so a second call does not register twice.

## Example: p5.brush 3

[`p5.brush`](https://github.com/acamposuribe/p5.brush) 3 requires `p5 ^2.2` and a WEBGL canvas. Its ES build registers itself with `if (typeof p5 !== "undefined") p5.registerAddon(...)`, so the global matters here too. In instance mode you also call `brush.instance(p)` before `setup`:

<!-- snippet: skip (p5.brush is not a dependency of this repo; the same code ran in a scratch Vite app on p5 2.3.4 with p5.brush 3.0.0) -->

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';
	import { withGlobalP5 } from './addons';

	let brush = $state<typeof import('p5.brush') | null>(null);
	const bridge = createP5Bridge({ weight: 1.4, color: '#2f2a26' });

	onMount(async () => {
		brush = await withGlobalP5(() => import('p5.brush'));
	});

	const sketch = (p: p5) => {
		brush!.instance(p);
		p.setup = () => {
			p.createCanvas(500, 400, p.WEBGL);
		};
		p.draw = () => {
			p.background('#f6f1e8');
			brush!.set('HB', bridge.state.color, bridge.state.weight);
			brush!.line(-200, -100, 200, 100);
			brush!.fill('#d7c3a3', 120);
			brush!.hatch(7, 35);
			brush!.rect(-100, 20, 120, 90, 'center');
		};
	};
</script>

{#if brush}<P5Canvas {sketch} />{/if}
```

The `{#if brush}` block holds the canvas back until the add-on is loaded. `bridge.state` drives the stroke live, as in any other sketch.

In this setup the sketch rendered with and without the global. The global is still the supported path: p5.brush's registered hooks keep its per-instance state, its `push`/`pop` stack and the seeds from `randomSeed` and `noiseSeed` in step with p5, and the ES build skips them when `p5` is undefined.

## Example: p5.sound

`p5.sound` 0.4 is a classic script. It needs the global before it loads and then attaches to the prototype:

<!-- snippet: skip (p5.sound is not a dependency of this repo and ships no types; ran in a scratch Vite app on p5 2.3.4 with p5.sound 0.4.1) -->

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';
	import { withGlobalP5 } from './addons';

	let ready = $state(false);

	onMount(async () => {
		await withGlobalP5(() => import('p5.sound'));
		ready = true;
	});

	const sketch = (p: p5) => {
		const sound = p as unknown as { userStartAudio(): Promise<void> };
		p.setup = () => {
			p.createCanvas(200, 100);
		};
		p.mousePressed = () => {
			void sound.userStartAudio();
		};
	};
</script>

{#if ready}<P5Canvas {sketch} />{/if}
```

After the import, `getAudioContext`, `loadSound` and `userStartAudio` are on the instance, and `p.constructor.Oscillator` is defined. Browsers block audio until a user gesture, so start it from an event handler as above. Do not copy the older recipe that imports `p5/lib/addons/p5.sound`: p5 2.3.4 ships no `lib/addons` folder.

## Writing your own add-on

An add-on is a function passed to `p5.registerAddon`. `fn` is `p5.prototype`, so members you assign there appear on every instance. Lifecycle hooks (`presetup`, `postsetup`, `predraw`, `postdraw`, `remove`) are called with `this` set to the sketch instance, so use `function`, not an arrow ([creating libraries guide](https://beta.p5js.org/contribute/creating_libraries)). The hooks are awaited by p5.

```ts
// badge-addon.ts
import type p5 from 'p5';

export interface BadgeAddon {
	badge(label: string): void;
}

type Hook = (this: p5) => void | Promise<void>;

export function registerBadge(P5: typeof p5) {
	if ('badge' in P5.prototype) return;
	P5.registerAddon(
		(_p5: unknown, fn: Record<string, unknown>, lifecycles: Record<string, Hook>) => {
			fn.badge = function (this: p5, label: string) {
				this.text(label, 10, 20);
			};
			lifecycles.postdraw = function () {
				// runs after every draw() of every sketch
			};
		}
	);
}
```

`registerAddon` ignores a function it has seen before, but an HMR reload creates a new function, so the `'badge' in P5.prototype` guard stops it registering a second set of hooks. Register from `onMount`, with the p5 class you imported there, and type the members with `SketchFn<Ext>`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { P5Canvas, type SketchFn } from 'svelte-p5';
	import { registerBadge, type BadgeAddon } from './badge-addon';

	let ready = $state(false);

	onMount(async () => {
		const { default: P5 } = await import('p5');
		registerBadge(P5);
		ready = true;
	});

	const sketch: SketchFn<BadgeAddon> = (p) => {
		p.setup = () => {
			p.createCanvas(200, 100);
		};
		p.draw = () => {
			p.background(240);
			p.badge('hello');
		};
	};
</script>

{#if ready}<P5Canvas {sketch} />{/if}
```

In a scratch app this drew the badge on every frame and ran `postdraw` once per frame after two `registerBadge` calls.

## p5 1.x

The `globalThis.p5` helper is the same on p5 1.11, and p5 1 add-ons that predate `registerAddon` need it for the same reason. The 1.x add-on files live inside the `p5` package (`p5/lib/addons/...`). This was not run against p5 1.x for this page.

## Constructors from add-ons

In instance mode, classes an add-on adds hang off the constructor: `p.constructor.Oscillator`, not `p5.Oscillator`. This is the same rule the [React wrapper](./migration-from-react-p5-wrapper.md#constructors-and-plugins) documents for `p5.constructor.Vector`.

## Check it works

A missing global shows up as `ReferenceError: p5 is not defined` when a classic add-on loads. A missing registration shows up as `p.someMethod is not a function` at `setup`. For both, confirm the order: add-on loaded, then `<P5Canvas>` mounted. See also [p5 1 to 2 pitfalls](../p5-2-pitfalls.md#add-ons-and-types) for which add-ons run on p5 2.
