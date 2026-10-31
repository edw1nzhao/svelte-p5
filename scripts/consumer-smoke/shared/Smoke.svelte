<script lang="ts">
	import { P5Canvas, createP5Bridge, disableFES, type ExtendedP5, type SketchFn } from 'svelte-p5';
	import { FPSMonitor, Sketch } from 'svelte-p5-components';
	import { ExportButton } from 'svelte-p5-components/export';
	import { surface } from './entries.js';

	interface Ext {
		reset(): void;
	}

	const bridge = createP5Bridge({ radius: 40, label: 'smoke' });
	disableFES();

	let instance = $state<ExtendedP5<Ext> | null>(null);
	let ready = $state(false);

	function typeProbes(p: ExtendedP5<Ext>) {
		p.reset();
		const radius: number = bridge.state.radius;
		void radius;
		// @ts-expect-error the bridge state has no such key
		bridge.state.missing = 1;
		// @ts-expect-error the instance carries Ext and p5 only
		p.missing();
	}
	void typeProbes;

	const sketch: SketchFn<Ext> = (p) => {
		p.reset = () => {
			bridge.state.radius = 40;
		};
		p.setup = async () => {
			p.createCanvas(200, 120);
		};
		p.draw = () => {
			p.background(220);
			p.circle(p.width / 2, p.height / 2, bridge.state.radius);
		};
	};
</script>

<main data-testid="smoke">
	<div data-testid="canvas-host" style="width: 200px; height: 120px">
		<P5Canvas {sketch} bind:instance onReady={() => (ready = true)} />
	</div>
	<div data-testid="sketch-host" style="width: 200px; height: 120px">
		<Sketch {sketch} loop="demand" {bridge}>
			<FPSMonitor />
			<ExportButton options={{ scale: 2, seed: 'smoke' }} />
		</Sketch>
	</div>
	<p data-testid="status">ready={ready} instance={instance !== null}</p>
	<div hidden id="surface" data-surface={JSON.stringify(surface)}></div>
</main>
