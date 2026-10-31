# Zooming a timeline

`TimelineTrack` and `TimelineScrubber` can show a slice of the timeline instead of the whole of it. That slice, the **view**, is bindable, so the same two numbers can drive your sketch's x-axis: zoom the timeline and the visualization zooms with it.

Nothing changes unless you opt in. Without `zoomable`, `viewStart` or `viewEnd`, the track spans the full duration exactly as before.

## Zoom the timeline and the sketch together

Bind `viewStart` and `viewEnd`, and map time to x with `timeToX` inside `draw`. The view is a pair of plain numbers, so the sketch reads the current value on every frame.

```svelte
<script lang="ts">
	import { Sketch, TimelineScrubber, timeToX } from 'svelte-p5-components';
	import type p5 from 'p5';

	let { events }: { events: { time: number; value: number }[] } = $props();

	const duration = 600;
	let currentTime = $state(0);
	let viewStart = $state(0);
	let viewEnd = $state(duration);

	const sketch = (p: p5) => {
		p.draw = () => {
			const view = { start: viewStart, end: viewEnd };
			p.background(250);
			p.noStroke();
			p.fill(59, 130, 246);
			for (const e of events) {
				if (e.time < view.start || e.time > view.end) continue;
				p.circle(timeToX(e.time, view, 0, p.width), p.height - e.value, 6);
			}
			p.stroke(239, 68, 68);
			const x = timeToX(currentTime, view, 0, p.width);
			p.line(x, 0, x, p.height);
		};
	};
</script>

<div style="height: 300px"><Sketch {sketch} /></div>
<TimelineScrubber
	{duration}
	zoomable
	minViewDuration={1}
	bind:currentTime
	bind:viewStart
	bind:viewEnd
/>
```

`timeToX(time, view, left, right)` maps the view onto any pixel span and extrapolates outside it; `xToTime` is its inverse. Here the canvas and the track are the same width, so `0..p.width` lines up with the track.

## Aligning with a track that is not the canvas width

When the canvas is wider than the track, or offset from it, ask the track where it is. `onBoundsChange` reports the track's client-pixel `left`, `right` and `width` on mount and on every resize. Convert to canvas coordinates by subtracting the canvas's own `left`.

```svelte
<script lang="ts">
	import { TimelineTrack, timeToX, type TimelineTrackBounds } from 'svelte-p5-components';

	let { canvasLeft }: { canvasLeft: number } = $props();

	let currentTime = $state(0);
	let viewStart = $state(0);
	let viewEnd = $state(100);
	let bounds = $state<TimelineTrackBounds>({ left: 0, right: 0, width: 0 });

	// The playhead's x in canvas coordinates; read it from your sketch's draw.
	const playheadX = $derived(
		timeToX(
			currentTime,
			{ start: viewStart, end: viewEnd },
			bounds.left - canvasLeft,
			bounds.right - canvasLeft
		)
	);
</script>

<TimelineTrack
	duration={100}
	zoomable
	bind:currentTime
	bind:viewStart
	bind:viewEnd
	onBoundsChange={(b) => (bounds = b)}
/>
<output>{playheadX.toFixed(0)}</output>
```

## Gestures and keys

With `zoomable`:

| Input                            | Effect                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| Drag the rail                    | Draws a zoom region; releasing zooms to it. A press that moves under 5px seeks instead |
| Alt-drag or middle-button drag   | Pans                                                                                   |
| Ctrl/Cmd + wheel, trackpad pinch | Zooms around the pointer                                                               |
| Wheel or horizontal scroll       | Pans. When the view cannot move further the event is left alone, so the page scrolls   |
| Two-finger touch pinch           | Zooms around the midpoint of the fingers                                               |
| `+` / `-`                        | Zooms in or out around the playhead (or the view's center when the playhead is off it) |
| `[` / `]`                        | Pans by a tenth of the view                                                            |
| `0`                              | Zooms to fit                                                                           |
| Arrow keys (always)              | Seek by 1% of the view, or 5% with Shift                                               |

`TimelineScrubber` with `zoomable` also shows zoom out, zoom to fit (labelled with the zoom level) and zoom in buttons.

`minViewDuration` is the narrowest view the user can reach, by any gesture. It defaults to `duration / 1000`; set it in your own units (`minViewDuration={1}` for one second). A drag-to-zoom narrower than that grows around its midpoint.

## What happens to the playhead, selection and segments

Everything is drawn in view coordinates. While zoomed:

- The playhead is hidden when `currentTime` is outside the view; the progress fill runs to whichever edge it is past.
- The selection band is clipped to the view, and a handle whose time is off-view is not rendered. Dragging the band still moves the whole selection, and a dragged handle stops at the view's edge.
- Segments are clipped to the view; segments wholly outside it are not rendered.

## Drawing behind the track

The `underlay` snippet renders behind the rail and receives the view, the duration, and a `timeToPercent` mapper. Use it for an activity gradient or any other data layer. It is DOM, not canvas: build a CSS gradient, absolutely positioned bars, or an SVG.

```svelte
<script lang="ts">
	import { TimelineTrack } from 'svelte-p5-components';

	let { activity }: { activity: number[] } = $props();
	const duration = 100;
	let viewStart = $state(0);
	let viewEnd = $state(duration);
</script>

<TimelineTrack {duration} zoomable bind:viewStart bind:viewEnd>
	{#snippet underlay({ timeToPercent })}
		{@const step = duration / activity.length}
		{#each activity as level, i (i)}
			<div
				style:position="absolute"
				style:top="0"
				style:bottom="0"
				style:left="{timeToPercent(i * step)}%"
				style:width="{timeToPercent((i + 1) * step) - timeToPercent(i * step)}%"
				style:background="rgba(16, 185, 129, {level})"
			></div>
		{/each}
	{/snippet}
</TimelineTrack>
```

The underlay ignores the pointer, so every gesture above still works over it.

## The view math on its own

The functions the components use are exported, so a sketch, a store or a test can do the same arithmetic. All take and return a `TimelineView` (`{ start, end }`) and treat the timeline as `0..duration`.

| Function                                        | Returns                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `zoomView(view, factor, center, duration, min)` | The view scaled by `factor` (< 1 zooms in) with `center` kept in place          |
| `panView(view, delta, duration)`                | The view shifted by `delta`, stopped at the edges                               |
| `zoomViewToRange(a, b, duration, min)`          | The view for a drag from `a` to `b`, at least `min` wide                        |
| `clampView(view, duration)`                     | The view clamped into the timeline; an empty or inverted view becomes the whole |
| `timeToX(time, view, left, right)` / `xToTime`  | Time to pixel and back, unclamped                                               |
| `isTimeInView(time, view)`                      | Whether `time` is inside the view, edges included                               |
| `viewZoomLevel(view, duration)`                 | `duration / view width`: 1 is the full timeline                                 |

```ts
import { panView, zoomView, type TimelineView } from 'svelte-p5-components';

let view: TimelineView = { start: 0, end: 600 };
view = zoomView(view, 0.5, 120, 600, 1);
view = panView(view, 30, 600);
```

## Not included

The track is DOM, so there are no canvas render layers or device-pixel-ratio handling. If a layer needs a canvas, put a `<canvas>` in `underlay` and size it yourself. The timeline always starts at 0; offset your data times if they start elsewhere.
