# Migrating from `p5-svelte`

If you're on [`p5-svelte`](https://github.com/tonyketcham/p5-svelte) (last released 3.1.2 in 2022, Svelte 3 era) and want to switch, the port is usually ten minutes per component.

## Why move

- Svelte 5 native. Runes, `$bindable`, `$effect`. No legacy reactivity.
- No memory leak. `<P5Canvas>` calls `instance.remove()` on unmount; `p5-svelte`'s component does not, which stacks ghost canvases on HMR, route transitions, and every `{#if}` toggle.
- Active maintenance, conventional commits, release-please, dependabot.
- Performance utilities (`disableFES`, `createColorCache`, `createFontAtlas`) included.
- Optional higher-level layer (auto-resize, FPS, draggable windows) in `svelte-p5-components`.

## Install

```bash
pnpm remove p5-svelte
pnpm add svelte-p5
# optional:
pnpm add svelte-p5-components
```

## API mapping

| `p5-svelte`                  | `svelte-p5`                            | Notes                                                     |
| ---------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `import P5 from 'p5-svelte'` | `import { P5Canvas } from 'svelte-p5'` | Named export. The single-letter `P5` was collision-prone. |
| `<P5 {sketch} />`            | `<P5Canvas {sketch} />`                | Same shape, minus the legacy props.                       |
| `<P5 {sketch} on:instance>`  | `<P5Canvas {sketch} bind:instance />`  | Event dispatcher replaced by a bindable prop.             |
| `<P5 on:ref>`                | `bind:this` on a wrapping element      | You already have the DOM ref through Svelte.              |
| `parentDivStyle`             | `style` (or `class`)                   | Same behaviour, shorter name.                             |
| `target` + action workaround | Normal Svelte DOM flow                 | The component mounts into the div it renders.             |
| `debug`                      | Removed                                | Was a diagnostic `console.log`. Use DevTools.             |

## Minimal port

Before:

```svelte
<script>
	import P5 from 'p5-svelte';

	let p5Instance;

	const sketch = (p5) => {
		p5.setup = () => p5.createCanvas(400, 400);
		p5.draw = () => {
			p5.background(240);
			p5.circle(p5.mouseX, p5.mouseY, 40);
		};
	};
</script>

<P5 {sketch} on:instance={(e) => (p5Instance = e.detail)} />
```

After:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let p5Instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 400);
		p.draw = () => {
			p.background(240);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas {sketch} bind:instance={p5Instance} />
```

## State: replacing manual subscription

`p5-svelte` didn't ship a state bridge, so most users wired up writable stores by hand.

Before:

```svelte
<script>
	import P5 from 'p5-svelte';
	import { writable } from 'svelte/store';

	const radius = writable(40);
	let currentRadius = 40;
	radius.subscribe((v) => (currentRadius = v));

	const sketch = (p5) => {
		p5.draw = () => p5.circle(100, 100, currentRadius);
	};
</script>

<P5 {sketch} />
<input type="range" bind:value={$radius} />
```

After:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const bridge = createP5Bridge({ radius: 40 });

	const sketch = (p: p5) => {
		p.draw = () => p.circle(100, 100, bridge.state.radius);
	};
</script>

<P5Canvas {sketch} />
<input type="range" bind:value={bridge.state.radius} />
```

No `subscribe`, no mirror variable.

## What you should notice after migrating

Detached-canvas counts stay flat on `{#if}` toggles. HMR no longer stacks canvases. Route transitions with a `<P5Canvas>` inside release properly. You don't do anything to get this — it's the whole reason to move.

## Dependency version

`p5-svelte` peered on `p5 ^1.4`. This library peers `p5 >=1.11.0 <3`. If you're on an older p5 minor, bump to 1.11.x for the latest bugfixes. p5 2.x support lands in a later release.

## What migrating doesn't change

Your sketch code is unchanged. `p.setup`, `p.draw`, `p.loadFont`, every p5 API call ports 1:1.

The `loadFont()` perf trap isn't a library issue either. Variable-font path rendering is slow in p5 regardless of the wrapper. See [performance.md](./performance.md) for the full treatment.

SSR is the same story. `<P5Canvas>` dynamically imports p5 on the client, so SvelteKit SSR works without `{#if browser}` guards.

## Stuck?

Open an [issue](https://github.com/edw1nzhao/svelte-p5/issues) with your before/after and I'll help.
