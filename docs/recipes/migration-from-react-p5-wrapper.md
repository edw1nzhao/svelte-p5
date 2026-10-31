# Migrating from `@p5-wrapper/react`

[`@p5-wrapper/react`](https://github.com/P5-wrapper/react) wraps a p5 sketch in a React component and sends React props into the sketch through `updateWithProps`. In `svelte-p5` the sketch reads reactive state directly, so most of the wrapper API disappears. This page maps each part.

Two versions are in use, and the component name differs between them:

| `@p5-wrapper/react` | component        | p5 and React                            | extras                                   |
| ------------------- | ---------------- | --------------------------------------- | ---------------------------------------- |
| 4.x                 | `ReactP5Wrapper` | depends on `p5 ^1.9.4`; `react >= 18.2` | `fallback`, `updateWithProps`            |
| 5.x                 | `P5Canvas`       | peers `p5 >= 2.0.0`, `react >= 19`      | adds `updater`, `loading`, `error` props |

`svelte-p5` also exports a `P5Canvas`. It is a different component with a different API, so check which package an import comes from while porting.

## Checklist

1. `pnpm add svelte-p5 p5`, and remove `@p5-wrapper/react` and `@p5-wrapper/next`.
2. Move props that reach `updateWithProps` into `createP5Bridge` state, and read `bridge.state` in `draw`.
3. Replace `updater` with writes to bridge state from the sketch.
4. Replace `fallback`, `loading`, `error` and children with plain Svelte markup.
5. Replace `window.p5 = p5` plus a plugin import with the [add-on recipe](./loading-addons.md).
6. Drop the Next.js dynamic import. `<P5Canvas>` only imports p5 in the browser.
7. Check [p5 1 to 2 pitfalls](../p5-2-pitfalls.md) if you are also moving from p5 1 to 2.

## API mapping

| `@p5-wrapper/react`                                                                       | `svelte-p5`                                                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `<ReactP5Wrapper sketch={s} />` (4.x), `<P5Canvas ... />` (5.x)                           | `<P5Canvas {sketch} />` from `svelte-p5`                                           |
| custom props plus `p5.updateWithProps = (props) => ...`                                   | `createP5Bridge({ ... })`; read `bridge.state` inside the sketch                   |
| `Sketch<Props>`, `SketchProps`                                                            | `(p: p5) => void` or `SketchFn<Ext>`; the props type becomes the bridge state type |
| `P5CanvasInstance` (typed `p5` argument)                                                  | `import type p5 from 'p5'`                                                         |
| `updater={(instance, props) => ...}` (5.x)                                                | write to bridge state from `draw`, or use `bind:instance` and `onReady`            |
| `ref` to the p5 instance ([react#540](https://github.com/P5-wrapper/react/issues/540))    | `bind:instance`                                                                    |
| exposing imperative methods ([react#258](https://github.com/P5-wrapper/react/issues/258)) | `SketchFn<Ext>` plus `bind:instance`                                               |
| `fallback={<h1>...</h1>}`                                                                 | `{#if sketch}<P5Canvas {sketch} />{:else}...{/if}`                                 |
| `loading` (5.x)                                                                           | a flag set from `onReady`, and `{#if}`                                             |
| `error` (5.x)                                                                             | `try`/`catch` in the sketch and an error variable                                  |
| children rendered over the canvas, `CanvasContainerClassName` / `P5WrapperClassName`      | a `position: relative` wrapper element and your own class                          |
| `p5.constructor.Vector`, `p5.constructor.Envelope`                                        | unchanged: `p.constructor.Vector`                                                  |
| `(window as any).p5 = p5` before `import('p5/lib/addons/p5.sound')`                       | [loading add-ons](./loading-addons.md)                                             |
| `@p5-wrapper/next` dynamic import                                                         | not needed                                                                         |

## Props into the sketch

React re-renders and calls `updateWithProps` when props change. Here the sketch reads the value whenever it draws.

Before (4.x, with 5.x using `P5Canvas`):

```tsx
function sketch(p5) {
	let rotation = 0;
	p5.setup = () => p5.createCanvas(600, 400, p5.WEBGL);
	p5.updateWithProps = (props) => {
		rotation = (props.rotation * Math.PI) / 180;
	};
	p5.draw = () => {
		p5.background(100);
		p5.normalMaterial();
		p5.rotateY(rotation);
		p5.box(100);
	};
}

export function App() {
	const [rotation, setRotation] = useState(0);
	return <ReactP5Wrapper sketch={sketch} rotation={rotation} />;
}
```

After:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ rotation: 0 });

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400, p.WEBGL);
		};
		p.draw = () => {
			p.background(100);
			p.normalMaterial();
			p.rotateY((bridge.state.rotation * Math.PI) / 180);
			p.box(100);
		};
	};
</script>

<P5Canvas {sketch} />
<input type="range" min="0" max="360" bind:value={bridge.state.rotation} />
```

There is no prop diffing. `updateWithProps` needed a deep comparison of its props ([react#227](https://github.com/P5-wrapper/react/issues/227) reports a large object taking over two seconds), and a `$state` proxy read is a property access. If the sketch calls `noLoop()`, add an effect that calls `instance?.redraw()` when the state changes; see [state bridges](../bridges.md#common-confusion-do-i-need-an-effect-to-push-state-into-p5).

The sketch is created once per mount, so changing state does not recreate the canvas (the cause of [react#415](https://github.com/P5-wrapper/react/issues/415) and [react#463](https://github.com/P5-wrapper/react/issues/463) in React).

## State out of the sketch (`updater`)

In 5.x, `updater(instance, props)` runs on prop changes so the sketch can feed React state. Write to the same bridge instead:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ rotation: 0, frame: 0 });

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400, p.WEBGL);
		};
		p.draw = () => {
			p.background(100);
			p.rotateY(bridge.state.rotation);
			p.box(100);
			bridge.state.frame = p.frameCount;
		};
	};
</script>

<P5Canvas {sketch} /><p>Frame {bridge.state.frame}</p>
```

Writing state every frame updates the DOM every frame. For a readout that is fine; for something that changes less often, write only when it changes.

## Imperative methods and the instance

[react#258](https://github.com/P5-wrapper/react/issues/258) and [react#540](https://github.com/P5-wrapper/react/issues/540) ask for a way to call into a sketch from the parent. `bind:instance` gives you the p5 instance, and `SketchFn<Ext>` types the members the sketch installs on it:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type { ExtendedP5, SketchFn } from 'svelte-p5';

	interface GameExt {
		reset(): void;
		position(): { x: number; y: number };
	}

	let instance = $state<ExtendedP5<GameExt> | null>(null);

	const sketch: SketchFn<GameExt> = (p) => {
		let x = 0;
		let y = 0;
		p.reset = () => {
			x = 0;
			y = 0;
		};
		p.position = () => ({ x, y });
		p.setup = () => {
			p.createCanvas(400, 300);
		};
		p.draw = () => {
			p.background(240);
			x += 1;
			y += 0.5;
			p.circle(x % p.width, y % p.height, 20);
		};
	};
</script>

<P5Canvas {sketch} bind:instance />
<button onclick={() => instance?.reset()}>Reset</button>
```

## Fallback, loading and error UI

None of these need wrapper props, because the wrapper is not rendering React children around the canvas.

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	interface Props {
		choice?: (p: p5) => void;
	}
	let { choice }: Props = $props();

	let ready = $state(false);
	let error = $state<string | null>(null);

	function guarded(inner: (p: p5) => void) {
		return (p: p5) => {
			inner(p);
			const draw = p.draw;
			p.draw = () => {
				try {
					draw();
				} catch (e) {
					error = e instanceof Error ? e.message : String(e);
					p.noLoop();
				}
			};
		};
	}
</script>

{#if choice}
	{#key choice}
		<P5Canvas sketch={guarded(choice)} onReady={() => (ready = true)} />
	{/key}
	{#if !ready}<p>The sketch is loading.</p>{/if}
	{#if error}<p role="alert">An error occurred: {error}</p>{/if}
{:else}
	<h1>No sketch selected yet.</h1>
{/if}
```

`P5Canvas` reads `sketch` once at mount, so `{#key}` is what swaps one sketch for another, as selecting a new `sketch` does in the React `fallback` example.

`<svelte:boundary>` catches errors thrown while rendering components. An error thrown inside `draw` comes from p5's animation-frame loop, which is outside the component tree, so it needs the `try`/`catch` above.

## Children over the canvas

`P5Canvas` takes no children. Put the canvas and the overlay in a positioned wrapper:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400);
		};
		p.draw = () => {
			p.background(30, 41, 59);
		};
	};
</script>

<div class="stage">
	<P5Canvas {sketch} />
	<p class="overlay">Hello world!</p>
</div>

<style>
	.stage {
		position: relative;
		width: 600px;
		height: 400px;
	}
	.overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		color: white;
		font-size: 2rem;
		pointer-events: none;
	}
</style>
```

For a canvas that fills its container and tracks its size, use `<Sketch>` from `svelte-p5-components`, which also applies pixel density.

## Constructors and plugins

Constructors keep the instance-mode form. Use `p.constructor.Vector.random2D()` where global mode has `p5.Vector.random2D()`, or call `p.createVector()`.

Plugins need `p5` on `globalThis` before they load. The React wrapper documents `window.p5 = p5` followed by a dynamic import of `p5/lib/addons/p5.sound`, which is the p5 1 file layout. Under p5 2, `p5.sound` is a separate npm package. The [add-on recipe](./loading-addons.md) has the working form for both.

## Next.js and SSR

`@p5-wrapper/next` exists because the React component cannot be imported on the server. `<P5Canvas>` imports p5 inside `onMount`, so a SvelteKit page that renders it server-side needs no dynamic import or `{#if browser}` guard.

## What does not carry over

- Strict-mode double mounting ([react#162](https://github.com/P5-wrapper/react/issues/162), [react#255](https://github.com/P5-wrapper/react/issues/255)): Svelte does not mount twice in development. The instance is created in `onMount` and removed in its teardown, including on HMR.
- `windowResized` and container sizing: p5 calls `windowResized` itself in instance mode. To follow the size of a container rather than the window, use `<Sketch>` and its `onResize` callback.
