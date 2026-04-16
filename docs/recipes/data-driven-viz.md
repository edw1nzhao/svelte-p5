# Data-driven visualizations

When the canvas is showing a transcript, a time series, or any data set with a notion of time, a few patterns recur. None of these are library-specific - they're just what works once your visualization grows beyond a single shape.

## Load data outside the sketch

Don't load CSV/JSON inside `p.setup` with `p.loadJSON()` or `p.loadStrings()` - that ties your data layer to p5's lifecycle and makes testing painful. Load in Svelte (with `fetch`, an `import`, or a SvelteKit `+page.ts` loader), then pass the parsed data to the sketch via a closure or bridge:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge } from 'svelte-p5';
	import type p5 from 'p5';

	let { data } = $props<{ data: { x: number; y: number; cluster: number }[] }>();

	const ui = createP5Bridge({ pointSize: 6 });

	const sketch = (p: p5) => {
		p.setup = () => p.createCanvas(600, 400);
		p.draw = () => {
			p.background(245);
			p.noStroke();
			for (const pt of data) {
				p.fill(['#ef4444', '#3b82f6', '#10b981'][pt.cluster] ?? '#888');
				p.circle(pt.x, pt.y, ui.state.pointSize);
			}
		};
	};
</script>

<P5Canvas {sketch} />
```

The data is a regular variable; `p.draw` reads it on every frame. If you swap `data` (e.g. user uploads a new file), the next frame redraws.

## Drive animation from a master clock, not `p.frameCount`

For dashboards or anything where multiple sketches need to be in sync, don't use `p.frameCount` as your time source - it's per-sketch. Use a shared tick (see [Multiple sketches sharing state](./shared-state.md)):

```ts
// timeline.svelte.ts
class Timeline {
	frame = $state(0);
	playing = $state(false);
	speed = $state(1); // frames per RAF

	#raf = 0;
	constructor() {
		if (typeof window !== 'undefined') {
			const loop = () => {
				if (this.playing) this.frame += this.speed;
				this.#raf = requestAnimationFrame(loop);
			};
			this.#raf = requestAnimationFrame(loop);
		}
	}
}

export const timeline = new Timeline();
```

Then each sketch animates against `timeline.frame`. Pause the timeline; everything pauses together. Scrub the timeline; everything jumps together.

## Snapshot reactive state at the top of each frame

If your `p.draw` reads the same reactive field multiple times (often the case with proxies or cross-store reads), capture once at the top:

```ts
p.draw = () => {
	const t = timeline.frame;
	const speaker = ui.state.selectedSpeaker;
	const range = ui.state.visibleRange;

	// every downstream calculation uses these consistent values
	for (const turn of turnsInRange(range)) {
		const isFocus = turn.speaker === speaker;
		// ...
	}
};
```

For 1–3 fields, this is overkill; for 10+ this is the difference between a draw call seeing a coherent slice of state vs. a smear of writes that landed mid-frame.

## Mapping data → pixels: use d3-scale, not arithmetic

p5 doesn't ship scale functions. Don't roll your own - `d3-scale` is one `pnpm add` away and does it correctly (linear, log, time, ordinal, with clamping, padding, ticks, all of it):

```ts
import { scaleLinear, scaleTime } from 'd3-scale';

const sketch = (p) => {
	let xScale: ReturnType<typeof scaleTime>;
	let yScale: ReturnType<typeof scaleLinear>;

	p.setup = () => {
		p.createCanvas(800, 400);
		xScale = scaleTime()
			.domain([new Date('2024-01-01'), new Date('2024-12-31')])
			.range([40, p.width - 40]);
		yScale = scaleLinear()
			.domain([0, 100])
			.range([p.height - 30, 30]);
	};

	p.windowResized = () => {
		// Re-derive on resize
		xScale.range([40, p.width - 40]);
		yScale.range([p.height - 30, 30]);
	};

	p.draw = () => {
		p.background(245);
		for (const point of data) {
			p.circle(xScale(point.date), yScale(point.value), 5);
		}
	};
};
```

Same library used by every modern dataviz tool. p5 handles the pixels, d3-scale handles the math. This is the boundary the architecture doc means by "p5 draws pixels, Svelte does everything else" - and "everything else" includes the scale logic.

## Time-series alignment for animated playback

If you're scrubbing through a timeline and need to find _which_ data points are visible at the current frame, binary search if the data is large:

```ts
function findIndexAtTime(items: { time: number }[], t: number): number {
	let lo = 0;
	let hi = items.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (items[mid].time === t) return mid;
		if (items[mid].time < t) lo = mid + 1;
		else hi = mid - 1;
	}
	return Math.max(0, hi);
}
```

Linear scans (`items.findIndex`) are fine up to a few thousand entries. Binary search starts to matter past that, especially if you call it every frame.

## Skipping draws when nothing changed

If your sketch is data-driven and the data only changes occasionally, don't run `p.draw` 60 times per second. Drop the loop, redraw on demand:

```svelte
<script lang="ts">
	import { P5Canvas } from 'svelte-p5';
	import type p5 from 'p5';

	let { data } = $props();
	let instance = $state<p5 | null>(null);

	const sketch = (p: p5) => {
		p.setup = () => {
			p.createCanvas(600, 400);
			p.noLoop(); // run draw only when we ask
		};
		p.draw = () => {
			p.background(245);
			for (const pt of data) p.circle(pt.x, pt.y, 4);
		};
	};

	$effect(() => {
		// data is the dependency; redraw when it changes
		data;
		instance?.redraw();
	});
</script>

<P5Canvas {sketch} bind:instance />
```

Saves CPU and battery. Only useful when your sketch isn't already animating something.

## Loading state and incremental data

For datasets you're streaming or fetching async, hold a Svelte loading flag and let the sketch decide what to draw:

```svelte
<script>
	let loading = $state(true);
	let data = $state<DataPoint[]>([]);

	(async () => {
		const res = await fetch('/api/points.json');
		data = await res.json();
		loading = false;
	})();

	const sketch = (p) => {
		p.draw = () => {
			p.background(245);
			if (loading) {
				p.fill(160);
				p.text('Loading…', 20, 30);
				return;
			}
			for (const pt of data) p.circle(pt.x, pt.y, 4);
		};
	};
</script>

<P5Canvas {sketch} />
```

Or render the loading state in Svelte and only mount `<P5Canvas>` once data is ready - both work, this version keeps the canvas mounted so you don't pay for re-mount on every refresh.

## Reference

The general approach (modular draw classes, snapshot context, separate animation clock, store-driven cross-sketch sync) is what large viz codebases converge on. The [transcript-explorer repo](https://github.com/edw1nzhao/transcript-explorer) shows this at scale (multiple panels, time-aligned playback, video sync) - though it predates this library and uses the older `p5-svelte` wrapper.
