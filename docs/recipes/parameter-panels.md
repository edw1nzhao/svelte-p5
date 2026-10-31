# Parameter panels with Tweakpane

A parameter panel is a set of sliders and pickers that drive a sketch. `svelte-p5` does not ship one, because Svelte already owns UI and [`createP5Bridge`](../bridges.md) already carries state into the sketch. [`svelte-tweakpane-ui`](https://github.com/kitschpatrol/svelte-tweakpane-ui) wraps [Tweakpane](https://tweakpane.github.io/docs/) as Svelte components, and its controls bind to the same state. This page shows the binding, presets, and keeping the state in the URL.

## Install

```bash
pnpm add svelte-tweakpane-ui
```

It depends on `tweakpane` itself and peers on `svelte ^4.0.0 || ^5.0.0`. This page was run with version 1.6.2 on Svelte 5.57 and p5 2.3.4. Its components are written with Svelte 4 syntax internally, so events such as `Button`'s click use `on:click`, which still works in a runes-mode component.

## Bind controls to bridge state

Each control takes `bind:value`. Binding a property of `bridge.state` is enough: the sketch reads `bridge.state` in `draw`, so a slider move shows on the next frame, with no effect or subscription.

<!-- snippet: skip (svelte-tweakpane-ui is not a dependency of this repo; the same markup ran in a scratch Vite app with svelte-tweakpane-ui 1.6.2 and p5 2.3.4) -->

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';
	import { Pane, Slider, Color, Checkbox } from 'svelte-tweakpane-ui';

	const bridge = createP5Bridge({ speed: 1, size: 24, color: '#6366f1', trails: true });

	const sketch = (p: p5) => {
		let t = 0;
		p.setup = () => {
			p.createCanvas(300, 200);
		};
		p.draw = () => {
			if (bridge.state.trails) p.background(255, 20);
			else p.background(255);
			t += bridge.state.speed * 0.05;
			p.fill(bridge.state.color);
			p.circle(150 + Math.cos(t) * 80, 100 + Math.sin(t) * 50, bridge.state.size);
		};
	};
</script>

<P5Canvas {sketch} />
<Pane position="fixed" title="Orbit">
	<Slider bind:value={bridge.state.speed} label="Speed" min={0} max={4} step={0.1} />
	<Slider bind:value={bridge.state.size} label="Size" min={4} max={80} step={1} />
	<Color bind:value={bridge.state.color} label="Colour" />
	<Checkbox bind:value={bridge.state.trails} label="Trails" />
</Pane>
```

`Pane` takes `position`: `'draggable'` (default), `'fixed'` (pinned to a corner) or `'inline'` (in the page flow). Only `'inline'` renders on the server; the other two render in the browser only. `Slider` also accepts `format`, `pointerScale` and `keyScale`, and `Folder` groups controls under a `title`.

If the sketch calls `noLoop()`, a slider change will not redraw by itself. Add an effect that calls `instance?.redraw()`; see [state bridges](../bridges.md#common-confusion-do-i-need-an-effect-to-push-state-into-p5).

## Presets

A preset is an object with the same keys as the state. Applying one is `Object.assign` onto `bridge.state`, and the controls follow because they are bound to it:

<!-- snippet: skip (svelte-tweakpane-ui is not a dependency of this repo; same app as above) -->

```svelte
<script lang="ts">
	import { Folder, List, Button } from 'svelte-tweakpane-ui';

	const DEFAULTS = { speed: 1, size: 24, color: '#6366f1', trails: true };
	const PRESETS = {
		calm: { speed: 0.3, size: 40, color: '#0ea5e9', trails: true },
		frantic: { speed: 3, size: 10, color: '#f43f5e', trails: false }
	};
	type PresetName = keyof typeof PRESETS;

	let preset = $state<PresetName>('calm');
</script>

<Folder title="Presets">
	<List bind:value={preset} label="Preset" options={Object.keys(PRESETS) as PresetName[]} />
	<Button title="Apply" on:click={() => Object.assign(bridge.state, PRESETS[preset])} />
	<Button title="Reset" on:click={() => Object.assign(bridge.state, DEFAULTS)} />
</Folder>
```

This goes inside the `Pane`, and `bridge` is the one from the first snippet.

## State in the URL

A link that reopens the sketch with the same settings needs no library: read `location.hash` once, write it back when the state changes. Keep the two functions in a plain module. `fromHash` keeps the types of the defaults, so a hand-edited or stale URL falls back to the default for any value that does not parse:

```ts
// url-state.ts
type Params = Record<string, string | number | boolean>;

export function fromHash<T extends Params>(defaults: T, hash: string): T {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const out: Params = { ...defaults };
	for (const [key, fallback] of Object.entries(defaults)) {
		const raw = params.get(key);
		if (raw === null) continue;
		if (typeof fallback === 'number') {
			const n = Number(raw);
			if (Number.isFinite(n)) out[key] = n;
		} else if (typeof fallback === 'boolean') {
			out[key] = raw === 'true';
		} else {
			out[key] = raw;
		}
	}
	return out as T;
}

export function toHash(state: Params): string {
	return '#' + new URLSearchParams(Object.entries(state).map(([k, v]) => [k, String(v)]));
}
```

Then apply it in `onMount` (the server has no `location`) and write it back from an effect:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';
	import { fromHash, toHash } from './url-state';

	const DEFAULTS = { speed: 1, size: 24, color: '#6366f1', trails: true };
	const bridge = createP5Bridge({ ...DEFAULTS });
	let synced = $state(false);

	onMount(() => {
		Object.assign(bridge.state, fromHash(DEFAULTS, location.hash));
		synced = true;
	});

	$effect(() => {
		const hash = toHash($state.snapshot(bridge.state));
		if (synced) history.replaceState(history.state, '', hash);
	});

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(300, 200);
		};
		p.draw = () => {
			p.background(255);
			p.fill(bridge.state.color);
			p.circle(150, 100, bridge.state.size);
		};
	};
</script>

<P5Canvas {sketch} />
```

The `Pane` markup from the first snippet sits next to `<P5Canvas>` unchanged. In the scratch app, opening `#speed=3&size=999x&trails=false&color=%23f43f5e` gave speed 3, trails off and the colour, with the unparsable `size` kept at 24. Moving a slider and pressing a preset button both rewrote the hash.

Two notes. In a SvelteKit app, call `replaceState` from `$app/navigation` instead of `history.replaceState`, so the router stays in sync. And a URL is user input: if a value can break the sketch, clamp it to the slider's `min` and `max` in `fromHash` before it reaches `bridge.state`.

`localStorage` works the same way with `JSON.stringify` and `JSON.parse` in place of the hash functions.
