<script lang="ts">
	import { DraggableSketch, DraggableWindow } from 'svelte-p5-components';
	import { disableFES } from 'svelte-p5/utils';
	import { dashboard } from './sharedState.svelte';
	import { orbitSketch, gridSketch, noiseSketch } from './sketches';

	disableFES();
</script>

<main>
	<!-- Fixed chrome (toolbar) with global controls. Svelte-native UI, no canvas. -->
	<header class="toolbar">
		<div class="title">svelte-p5 · dashboard</div>
		<div class="spacer"></div>
		<label class="ctrl">
			hue
			<input type="range" min="0" max="360" bind:value={dashboard.hue} />
			<span class="val">{dashboard.hue}°</span>
		</label>
		<label class="ctrl">
			density
			<input type="range" min="0.25" max="3" step="0.05" bind:value={dashboard.density} />
			<span class="val">{dashboard.density.toFixed(2)}×</span>
		</label>
		<label class="toggle">
			<input type="checkbox" bind:checked={dashboard.paused} />
			<span>paused</span>
		</label>
		<div class="spacer"></div>
		<div class="panel-toggles">
			<button class:active={dashboard.panels.orbit} onclick={() => dashboard.togglePanel('orbit')}
				>orbit</button
			>
			<button class:active={dashboard.panels.grid} onclick={() => dashboard.togglePanel('grid')}
				>grid</button
			>
			<button class:active={dashboard.panels.noise} onclick={() => dashboard.togglePanel('noise')}
				>noise</button
			>
		</div>
	</header>

	<!-- Three floating p5 windows, sharing the same dashboard state. -->
	{#if dashboard.panels.orbit}
		<DraggableSketch
			title="orbit"
			sketch={orbitSketch}
			initialX={40}
			initialY={80}
			width={440}
			height={340}
			onClose={() => dashboard.togglePanel('orbit')}
		/>
	{/if}

	{#if dashboard.panels.grid}
		<DraggableSketch
			title="grid"
			sketch={gridSketch}
			initialX={520}
			initialY={80}
			width={440}
			height={340}
			onClose={() => dashboard.togglePanel('grid')}
		/>
	{/if}

	{#if dashboard.panels.noise}
		<DraggableSketch
			title="noise"
			sketch={noiseSketch}
			initialX={280}
			initialY={460}
			width={440}
			height={340}
			onClose={() => dashboard.togglePanel('noise')}
		/>
	{/if}

	<!-- A pure-HTML DraggableWindow showing the "custom docs" pattern:
	     floating info panels don't need to be canvases. Any Svelte content works. -->
	<DraggableWindow title="about" initialX={980} initialY={80} width={320} height={280}>
		<div class="docs">
			<h3>What you're seeing</h3>
			<p>
				Three <code>&lt;DraggableSketch&gt;</code> panels, each a floating p5 canvas, all reading
				the same <code>dashboard</code> state object.
			</p>
			<p>
				Drag them by the title bar. Resize from the bottom-right corner. Close with ×; toggle back
				from the toolbar.
			</p>
			<p>
				This window itself is a <code>&lt;DraggableWindow&gt;</code> with arbitrary content - the "custom
				docs" pattern for info panels next to live sketches.
			</p>
		</div>
	</DraggableWindow>
</main>

<style>
	main {
		height: 100vh;
		width: 100vw;
		position: relative;
	}
	.toolbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 48px;
		background: #23272f;
		border-bottom: 1px solid #333842;
		display: flex;
		align-items: center;
		padding: 0 16px;
		gap: 16px;
		z-index: 200;
		font:
			13px/1 system-ui,
			sans-serif;
	}
	.title {
		font-weight: 700;
		color: #e5e7eb;
	}
	.spacer {
		flex: 1;
	}
	.ctrl {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #a8adb8;
	}
	.ctrl input[type='range'] {
		width: 120px;
	}
	.val {
		font-variant-numeric: tabular-nums;
		min-width: 40px;
		color: #e5e7eb;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #a8adb8;
	}
	.panel-toggles {
		display: flex;
		gap: 4px;
	}
	.panel-toggles button {
		background: #2c313a;
		border: 1px solid #383d47;
		color: #a8adb8;
		padding: 6px 12px;
		border-radius: 4px;
		font:
			12px/1 system-ui,
			sans-serif;
		cursor: pointer;
	}
	.panel-toggles button:hover {
		background: #34394396;
	}
	.panel-toggles button.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}
	.docs {
		padding: 16px;
		font:
			13px/1.5 system-ui,
			sans-serif;
		color: #333;
	}
	.docs h3 {
		margin: 0 0 8px;
		font-size: 14px;
	}
	.docs p {
		margin: 0 0 10px;
	}
	.docs code {
		background: #f1f3f5;
		padding: 1px 4px;
		border-radius: 3px;
		font-size: 12px;
	}
</style>
