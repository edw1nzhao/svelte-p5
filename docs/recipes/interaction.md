# Mouse, touch, and hit-testing

p5 gives you `p.mouseX`, `p.mouseY`, and event hooks like `p.mousePressed`. Most of what you need for interactive sketches is already there. This recipe covers the patterns that come up in real apps: hit-testing, syncing canvas hover with Svelte UI state, and handling touch input correctly.

## Basic mouse events

```ts
const sketch = (p) => {
	p.mousePressed = () => {
		// Returns true to allow default; false to prevent (rarely needed)
		console.log('clicked at', p.mouseX, p.mouseY);
	};

	p.mouseMoved = () => {
		// Fired only when mouse is over the canvas
	};

	p.mouseDragged = () => {
		// Fired when moving with a button held down
	};

	p.mouseReleased = () => {
		// ...
	};
};
```

These are bound to the p5 instance, so `<P5Canvas>`'s `instance.remove()` cleans them up correctly on unmount. Don't use `window.addEventListener` from inside a sketch - it survives `remove()` and leaks.

## Hit-testing shapes

The `hitTest` utility from `svelte-p5/utils` covers the common shapes:

```ts
import { hitTest } from 'svelte-p5/utils';

const items = [
	{ id: 'a', x: 100, y: 100, r: 30 },
	{ id: 'b', x: 200, y: 150, w: 80, h: 60 }
];

const sketch = (p) => {
	let hovered: string | null = null;

	p.draw = () => {
		p.background(245);
		hovered = null;

		for (const item of items) {
			const isCircle = 'r' in item;
			const inside = isCircle
				? hitTest.circle(p.mouseX, p.mouseY, item.x, item.y, item.r)
				: hitTest.rect(p.mouseX, p.mouseY, item.x, item.y, item.w, item.h);

			if (inside) hovered = item.id;
			p.fill(item.id === hovered ? 'tomato' : '#888');
			isCircle ? p.circle(item.x, item.y, item.r * 2) : p.rect(item.x, item.y, item.w, item.h);
		}
	};
};
```

For more complex hit detection (polygons, paths), p5 itself has nothing built in - you'll write your own (point-in-polygon ray cast, distance to segment, etc.).

## Sync canvas hover with Svelte UI

The most common pattern for any list-on-the-side, viz-in-the-middle dashboard: hovering a canvas item highlights a row in the sidebar, and vice versa. Use a shared `$state` (or [reactive class](./shared-state.md)) as the single source of truth:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	const items = [
		{ id: 'a', x: 100, y: 100, r: 30, label: 'Alpha' },
		{ id: 'b', x: 220, y: 140, r: 30, label: 'Bravo' },
		{ id: 'c', x: 320, y: 200, r: 30, label: 'Charlie' }
	];

	const ui = createP5Bridge<{ hoveredId: string | null }>({ hoveredId: null });

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(400, 300);
		p.draw = () => {
			p.background(245);
			let h: string | null = null;
			for (const item of items) {
				const inside = p.dist(p.mouseX, p.mouseY, item.x, item.y) < item.r;
				if (inside) h = item.id;
				p.fill(item.id === ui.state.hoveredId ? 'tomato' : '#888');
				p.circle(item.x, item.y, item.r * 2);
			}
			// Write back so the sidebar reflects current hover
			if (ui.state.hoveredId !== h) ui.state.hoveredId = h;
		};
	};
</script>

<div class="grid grid-cols-[1fr_180px] gap-4">
	<P5Canvas {sketch} />
	<ul>
		{#each items as item (item.id)}
			<li
				onmouseenter={() => (ui.state.hoveredId = item.id)}
				onmouseleave={() => (ui.state.hoveredId = null)}
				class:bg-amber-100={ui.state.hoveredId === item.id}
			>
				{item.label}
			</li>
		{/each}
	</ul>
</div>
```

The sketch writes `ui.state.hoveredId` when the mouse is over a circle. The sidebar `<li>` writes the same field on hover. Both sides observe and react to the same value - no events, no plumbing.

**One small detail**: the sketch writes back inside `p.draw` only if the value actually changed. Writing the same value every frame is wasteful (it triggers Svelte's reactivity). The `if (ui.state.hoveredId !== h)` guard saves the no-op writes.

## Touch events

`p.mousePressed`, `p.mouseDragged`, and friends fire for touch on most devices, with `p.mouseX`/`p.mouseY` reflecting the touch position. p5 also exposes touch-specific hooks:

```ts
p.touchStarted = (event) => {
	// `p.touches` is an array of all current touches: [{ x, y, id }, ...]
};
p.touchMoved = () => {
	/* ... */
};
p.touchEnded = () => {
	/* ... */
};
```

For a draggable element on a sketch you're putting on phones, you usually want `p.touchStarted` over `p.mousePressed` because the former fires earlier (no synthesized-mouse delay).

**Critical**: if your sketch handles drag, set `touch-action: none` on the canvas so the browser doesn't try to scroll the page when the user drags inside it:

```svelte
<P5Canvas {sketch} class="touch-none" />
```

If your sketch is just decorative or only responds to single taps (not drags), leave `touch-action` at its default so the user can scroll past the canvas normally.

## Disabling default scroll on `mouseWheel`

```ts
p.mouseWheel = (event) => {
	zoom += event.delta * -0.001;
	return false; // prevent the page from scrolling
};
```

Returning `false` calls `event.preventDefault()` internally. Use only when the wheel is genuinely meaningful inside the canvas (zoom, scrub) - otherwise leave the default so vertical scroll works.

## When to fall back to raw DOM events

p5's event hooks are tied to the canvas DOM node. If you need:

- Drag from inside the canvas to a Svelte component _outside_ the canvas, OR
- Pointer-event subtleties (`pointerType`, `pressure`) that p5 doesn't expose

…you can grab the canvas element from `bind:instance` and add listeners yourself. Just remember to remove them on unmount:

```svelte
<script>
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let instance = $state<p5 | null>(null);

	$effect(() => {
		if (!instance) return;
		const canvas = (instance as any).canvas as HTMLCanvasElement;

		const onPointer = (e: PointerEvent) => {
			console.log(e.pointerType, e.pressure);
		};
		canvas.addEventListener('pointerdown', onPointer);
		return () => canvas.removeEventListener('pointerdown', onPointer);
	});
</script>

<P5Canvas {sketch} bind:instance />
```

`$effect` cleanup handles teardown - no leaks even if the canvas remounts.
