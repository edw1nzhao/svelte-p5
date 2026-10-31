# Accessibility

A `<canvas>` is a picture to a screen reader: without a description it is announced as nothing at all. p5 solves this with [`describe()`](https://p5js.org/reference/p5/describe/), which writes a text description into the canvas's fallback content, where assistive technology reads it. The [p5 documentation style guide](https://p5js.org/contribute/documentation_style_guide/) asks for one in every example.

## Describe the canvas

`<P5Canvas>` and `<Sketch>` take a `description` prop and pass it to `describe()` once `setup()` has finished:

```svelte
<script lang="ts">
	import { P5Canvas, type SketchFn } from 'svelte-p5';

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(400, 200);
		};
		p.draw = () => {
			p.background(245);
			p.circle(p.mouseX, p.mouseY, 40);
		};
	};
</script>

<P5Canvas
	{sketch}
	description="A white circle that follows the pointer across a light grey canvas."
/>
```

The prop is ordinary Svelte state, so a description can follow the data the sketch draws. When the text changes, `describe()` runs again with the new text:

```svelte
<script lang="ts">
	import { P5Canvas, createP5Bridge, type SketchFn } from 'svelte-p5';

	const bridge = createP5Bridge({ count: 12 });
	const description = $derived(`${bridge.state.count} dots arranged in a ring.`);

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(200, 200);
		};
		p.draw = () => {
			p.background(255);
			for (let i = 0; i < bridge.state.count; i++) {
				const a = (i / bridge.state.count) * p.TWO_PI;
				p.circle(100 + Math.cos(a) * 70, 100 + Math.sin(a) * 70, 10);
			}
		};
	};
</script>

<P5Canvas {sketch} {bridge} {description} />
<input type="range" min="3" max="40" bind:value={bridge.state.count} />
```

Calling `p.describe()` inside `setup()` works too, and is what the playground examples do, so the description travels with a shared link. Use one or the other for a given canvas: both write to the same element, and whichever runs last wins.

## Writing a good description

Follow p5's guidance: say what is on the canvas and what it does, in the present tense, in a sentence or two. "A red ball bouncing around a grey canvas" is better than "Animation" or "p5 sketch". Mention what the reader can do when the sketch responds to input.

Leave decorative canvases undescribed and hide them instead, with `aria-hidden="true"` on a wrapping element, as the svelte-p5.dev home page does for its background sketch.

## Reduced motion

Some people set their system to reduce motion because animation makes them unwell. Svelte's [`prefersReducedMotion`](https://svelte.dev/docs/svelte/svelte-motion#prefersReducedMotion) reads that setting, and the `loop` prop turns it into a sketch that draws its first frame and then waits:

```svelte
<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { P5Canvas, type SketchFn } from 'svelte-p5';

	let t = 0;
	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(400, 200);
		};
		p.draw = () => {
			p.background(245);
			p.circle(200 + Math.sin(t) * 150, 100, 40);
			t += 0.05;
		};
	};
</script>

<P5Canvas
	{sketch}
	loop={prefersReducedMotion.current ? 'manual' : 'always'}
	description="A circle swinging from side to side."
/>
```

With `'manual'` the sketch redraws only when you call `invalidate(instance)`, so a still sketch can still respond to its controls. Give people a way to start the animation anyway: the playground's Pause button starts pressed under reduced motion, and pressing it resumes the sketch.

## Beyond a description

For sketches whose content is the point, such as charts or diagrams, p5's [`textOutput()`](https://p5js.org/reference/p5/textOutput/) and [`gridOutput()`](https://p5js.org/reference/p5/gridOutput/) generate a running description of the shapes on the canvas. Call them from `setup()`; they work inside `<P5Canvas>` like any other p5 function.
