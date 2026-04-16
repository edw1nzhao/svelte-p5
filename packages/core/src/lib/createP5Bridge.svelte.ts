/**
 * Bridge reactive Svelte state into a p5 sketch closure.
 *
 * Mutations from either side are seen by the other. Because p5's draw loop
 * reads fields on every frame, you don't need effects or subscriptions —
 * just read `bridge.state.foo` inside your sketch and write to it from
 * Svelte UI.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { P5Canvas, createP5Bridge } from 'svelte-p5';
 *   import type p5 from 'p5';
 *
 *   const bridge = createP5Bridge({ radius: 40, color: '#336699' });
 *
 *   const sketch = (p: p5) => {
 *     p.setup = () => p.createCanvas(400, 400);
 *     p.draw = () => {
 *       p.background(240);
 *       p.fill(bridge.state.color);
 *       p.circle(p.mouseX, p.mouseY, bridge.state.radius);
 *     };
 *   };
 * </script>
 *
 * <P5Canvas {sketch} />
 * <input type="range" bind:value={bridge.state.radius} min="10" max="200" />
 * ```
 */
export function createP5Bridge<T extends object>(initial: T) {
	const state = $state<T>(initial);
	return { state };
}

export type P5Bridge<T extends object> = ReturnType<typeof createP5Bridge<T>>;
