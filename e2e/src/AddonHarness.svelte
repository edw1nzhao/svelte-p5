<script lang="ts">
	import p5 from 'p5';
	import { P5Canvas, type P5Addon, type SketchFn } from 'svelte-p5';
	import type { AddonE2EState } from './state.js';

	const harness: AddonE2EState = {
		version: (p5 as unknown as { VERSION: string }).VERSION,
		registrations: 0,
		log: [],
		ready: 0,
		remount: () => key++
	};
	window.__addon = harness;
	let key = $state(0);

	// Module-level identity, as an add-on imported from a package would have.
	const counter: P5Addon = (_p5, fn, lifecycles) => {
		harness.registrations++;
		fn.addonGreeting = () => 'hi';
		lifecycles.presetup = async function () {
			harness.log.push(`presetup canvas=${Boolean(this._renderer)}`);
			await new Promise((r) => setTimeout(r, 30));
		};
		lifecycles.postdraw = function () {
			this.addonFrames = (this.addonFrames ?? 0) + 1;
		};
	};

	const sketch: SketchFn<{ addonGreeting(): string; addonFrames?: number }> = (p) => {
		p.setup = () => {
			harness.log.push(`setup greeting=${p.addonGreeting()}`);
			p.createCanvas(60, 60);
		};
		p.draw = () => {
			p.background(200);
			harness.postdrawFrames = p.addonFrames;
		};
	};
</script>

{#key key}
	<P5Canvas {sketch} addons={[counter]} onReady={() => harness.ready++} />
{/key}
