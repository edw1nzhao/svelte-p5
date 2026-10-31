<script lang="ts">
	import type p5 from 'p5';
	import { exportCanvas, stepFrames, type ExportOptions, type SketchFn } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import { ExportButton } from 'svelte-p5-components/export';
	import type { ExportE2EState } from './state.js';

	const params = new URLSearchParams(window.location.search);
	const webgl = params.get('renderer') === 'webgl';
	let instance = $state<p5 | null>(null);

	async function size(blob: Blob) {
		const bitmap = await createImageBitmap(blob);
		return { width: bitmap.width, height: bitmap.height, type: blob.type, bitmap };
	}

	const harness: ExportE2EState = {
		ready: false,
		stop: () => instance!.noLoop(),
		live: () => {
			const p = instance!;
			const canvas = p.drawingContext.canvas as HTMLCanvasElement;
			return {
				backingWidth: canvas.width,
				backingHeight: canvas.height,
				cssWidth: canvas.style.width,
				density: p.pixelDensity(),
				frameCount: p.frameCount,
				pixels: canvas.toDataURL()
			};
		},
		exportSize: async (options?: ExportOptions) => {
			const { bitmap, ...rest } = await size(await exportCanvas(instance!, options));
			bitmap.close();
			return rest;
		},
		exportInk: async (options?: ExportOptions) => {
			const { bitmap } = await size(await exportCanvas(instance!, options));
			const c = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = c.getContext('2d')!;
			ctx.drawImage(bitmap, 0, 0);
			const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
			let red = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i]! > 200 && data[i + 1]! < 60 && data[i + 2]! < 60) red++;
			}
			return red / (data.length / 4);
		},
		step: async (count: number) => {
			const out: { frameCount: number; width: number }[] = [];
			await stepFrames(instance!, {
				count,
				fps: 30,
				onFrame: async (f) => {
					const blob = await f.toBlob();
					const { width, bitmap } = await size(blob);
					bitmap.close();
					out.push({ frameCount: f.frameCount, width });
				}
			});
			return out;
		}
	};
	window.__export = harness;

	const sketch: SketchFn = (p) => {
		p.setup = () => {
			p.createCanvas(320, 200, webgl ? p.WEBGL : p.P2D);
		};
		p.draw = () => {
			p.background(255);
			p.noStroke();
			p.fill(220, 20, 20);
			if (webgl) p.rect(-80, -50, 160, 100);
			else p.rect(80, 50, 160, 100);
		};
	};
</script>

<div style="width: 320px; height: 200px">
	<Sketch {sketch} bind:instance onReady={() => (harness.ready = true)}>
		<ExportButton options={{ scale: 1, seed: 'e2e' }} />
	</Sketch>
</div>
