# TypeScript

svelte-p5 is written in TypeScript and ships declarations for every entry point. What you install for the `p5` types depends on the p5 major you run.

## Which types to install

| p5 version | Types come from                   | Install                            |
| ---------- | --------------------------------- | ---------------------------------- |
| 2.x        | p5 itself (`types/p5.d.ts`)       | nothing; `@types/p5` is not needed |
| 1.11       | the community `@types/p5` package | `npm install -D @types/p5@^1.7.7`  |

p5 2 bundles its declarations, including `setup(): void | Promise<void>`, so an `async` setup typechecks without a cast. p5 1.x ships none, and `@types/p5` stops at 1.7.7, so it can lag behind p5 1.11 itself.

`svelte-p5` and `svelte-p5-components` (from 1.2.0 and 2.2.0) declare `@types/p5@^1.7.7` as an optional peer dependency. Package managers do not install optional peers, so p5 2 projects get nothing extra; the declaration only tells a p5 1.11 project which range the packages' declarations were checked against, and lets pnpm and npm flag an incompatible version you already have.

Without `@types/p5` on p5 1.11, `import type p5 from 'p5'` fails with TS7016 ("Could not find a declaration file for module 'p5'"). The error appears in your code and, unless `skipLibCheck` is on, in svelte-p5's own declarations. Install the types rather than silencing it.

Both setups are exercised on every pull request: the smoke test packs the packages, installs them into a fresh SvelteKit app and a plain Vite app on p5 2.x and on p5 1.11 with `@types/p5`, and runs `svelte-check` with `skipLibCheck: false`.

## tsconfig

Svelte 5 libraries are resolved with the `bundler` algorithm, which SvelteKit's generated config already sets. A plain Vite project needs `"moduleResolution": "bundler"` too. Plain `node16` resolution cannot follow the `./X.svelte` imports inside any Svelte library's declarations; use `svelte-check` for type checking.

## Typing a sketch

A sketch is a function of the p5 instance. Annotate the parameter with the `p5` type, or type the whole function with `SketchFn`:

```svelte
<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(400, 300);
		};
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas {sketch} />
```

A plain `(p: p5) => void` is assignable to `SketchFn`, so sketches written as `const sketch = (p: p5) => { ... }` with `import type p5 from 'p5'` keep working.

### Async setup on p5 2

p5 2 awaits `setup` before the first `draw`, and `onReady` fires after it settles:

```svelte
<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';

	const sketch: SketchFn = (p) => {
		let img: ReturnType<typeof p.createImage>;
		p.setup = async () => {
			p.createCanvas(400, 300);
			img = await p.loadImage('/photo.jpg');
		};
		p.draw = () => {
			if (img) p.image(img, 0, 0);
		};
	};
</script>

<P5Canvas {sketch} />
```

On p5 1.11 the same code typechecks (a `Promise<void>` is assignable to the `void` return in `@types/p5`), but p5 1.x does not wait for the promise: `draw` may run first, which is why the `if (img)` guard is there. svelte-p5 still calls `onReady` after the promise settles on both majors.

## Typing members you add to the instance

`SketchFn<Ext>` declares the members your sketch installs on the instance. Inside the sketch the instance is already typed as extended, and everything that receives the instance afterwards (`onReady`, `bind:instance`) sees the same type through `ExtendedP5<Ext>`:

```svelte
<script lang="ts">
	import { P5Canvas, type ExtendedP5, type SketchFn } from 'svelte-p5';

	interface Controls {
		reset(): void;
		setSpeed(speed: number): void;
	}

	let instance: ExtendedP5<Controls> | null = $state(null);

	const sketch: SketchFn<Controls> = (p) => {
		let speed = 1;
		let x = 0;
		p.reset = () => {
			x = 0;
		};
		p.setSpeed = (next) => {
			speed = next;
		};
		p.setup = () => {
			p.createCanvas(400, 100);
		};
		p.draw = () => {
			p.background(240);
			x = (x + speed) % p.width;
			p.circle(x, 50, 30);
		};
	};

	function onReady(p: ExtendedP5<Controls>) {
		p.setSpeed(3);
	}
</script>

<P5Canvas {sketch} bind:instance {onReady} />
<button onclick={() => instance?.reset()}>Reset</button>
```

`Ext` is inferred from the `sketch` prop, so `<P5Canvas>` and `<Sketch>` need no explicit generic. `instance` is `null` before mount and after unmount, so keep the `| null`.

## Typing bridge state

`createP5Bridge` infers its state type from the initial object. Literal fields widen (`'idle'` becomes `string`), so pass the type explicitly when you want a union:

```ts
import { createP5Bridge, type P5Bridge } from 'svelte-p5';

interface BallState {
	radius: number;
	mode: 'orbit' | 'bounce';
}

export const bridge: P5Bridge<BallState> = createP5Bridge<BallState>({ radius: 40, mode: 'orbit' });
```

`P5Bridge<T>` is the return type, so a helper can accept any bridge of the right shape and a sketch can be built outside the component:

```ts
import type p5 from 'p5';
import type { P5Bridge } from 'svelte-p5';

interface BallState {
	radius: number;
	mode: 'orbit' | 'bounce';
}

export function ballSketch(bridge: P5Bridge<BallState>) {
	return (p: p5) => {
		p.setup = () => {
			p.createCanvas(400, 400);
		};
		p.draw = () => {
			p.background(240);
			const r = bridge.state.mode === 'orbit' ? bridge.state.radius : bridge.state.radius * 2;
			p.circle(p.mouseX, p.mouseY, r);
		};
	};
}
```

Because the factory is called once, the sketch function keeps a stable identity and the p5 instance is not re-created when `bridge.state` changes.

## Types exported by the packages

| Import                 | Type                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svelte-p5`            | `SketchFn<Ext>`, `ExtendedP5<Ext>`, `P5CanvasProps<Ext>`, `P5Bridge<T>`, `SketchContext<Ext>`, `LoopMode`, `ExportOptions`, `ExportFormat`, `StepFramesOptions`, `SteppedFrame`, `P5Addon`, `P5AddonLifecycles` |
| `svelte-p5-components` | `SketchProps<Ext>` and the props of each component                                                                                                                                                              |
| `svelte-p5-viz`        | `VizPanel`, `PanelContext`, `SceneConfig` and friends                                                                                                                                                           |
