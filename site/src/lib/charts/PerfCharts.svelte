<script lang="ts">
	/**
	 * Plain SVG bar/line charts for the perf-comparison page. No d3, no chart
	 * library - the math is trivial and the dependency footprint stays at 0.
	 *
	 * For richer charts (axes with proper ticks, log scales, time series),
	 * the data-driven-viz recipe recommends d3-scale - that's the right tool
	 * for those cases. These three charts are simple enough to do by hand.
	 */

	export type PerfResults = {
		config: { runs: number; toggles: number; particles: number; fpsWindowMs: number };
		aggregate: {
			leak: {
				modern: { alive: { mean: number }; time: { mean: number; std: number } };
				legacy: { alive: { mean: number }; time: { mean: number; std: number } };
			};
			fps: {
				modern: { mean: number; std: number };
				legacy: { mean: number; std: number };
			};
			ghostFps: Record<'modern' | 'legacy', Record<string, { mean: number }>>;
			scaling: Record<'modern' | 'legacy', Record<string, { elapsedMs: number; alive: number }>>;
		};
	};

	let { results }: { results: PerfResults } = $props();

	const MODERN = '#6366f1'; // indigo
	const LEGACY = '#94a3b8'; // slate-400

	// --- Chart 1: foreground fps under N ghost instances --------------------
	let ghostKeys = $derived(
		Object.keys(results.aggregate.ghostFps.modern)
			.map(Number)
			.sort((a, b) => a - b)
	);
	let ghostMaxFps = 65;
	let ghostBarHeight = 24;
	let ghostGap = 6;
	let ghostRowHeight = ghostBarHeight * 2 + ghostGap;
	let ghostChartWidth = 560;
	let ghostBarAreaWidth = $derived(ghostChartWidth - 110);
	let ghostHeight = $derived(ghostKeys.length * (ghostRowHeight + 16) + 48);

	// --- Chart 2: lifecycle wall-clock at 500 cycles ------------------------
	let lifecycleData = $derived({
		modern: results.aggregate.leak.modern.time.mean / 1000,
		legacy: results.aggregate.leak.legacy.time.mean / 1000,
		modernStd: results.aggregate.leak.modern.time.std / 1000,
		legacyStd: results.aggregate.leak.legacy.time.std / 1000
	});
	let lifecycleMax = $derived(Math.ceil(lifecycleData.legacy * 1.1));

	// --- Chart 3: scaling sweep (line chart) --------------------------------
	let scalingKeys = $derived(
		Object.keys(results.aggregate.scaling.modern)
			.map(Number)
			.sort((a, b) => a - b)
	);
	let scalingChartW = 560;
	let scalingChartH = 240;
	let scalingPad = { top: 20, right: 20, bottom: 36, left: 48 };
	let scalingPlotW = $derived(scalingChartW - scalingPad.left - scalingPad.right);
	let scalingPlotH = $derived(scalingChartH - scalingPad.top - scalingPad.bottom);
	let scalingMaxX = $derived(Math.max(...scalingKeys));
	let scalingMaxY = $derived(
		Math.max(
			...scalingKeys.map((k) => results.aggregate.scaling.legacy[k]?.elapsedMs ?? 0),
			...scalingKeys.map((k) => results.aggregate.scaling.modern[k]?.elapsedMs ?? 0)
		) / 1000
	);

	function scalingX(cycles: number) {
		return scalingPad.left + (cycles / scalingMaxX) * scalingPlotW;
	}
	function scalingY(seconds: number) {
		return scalingPad.top + scalingPlotH - (seconds / scalingMaxY) * scalingPlotH;
	}
	let scalingPath = (key: 'modern' | 'legacy') =>
		scalingKeys
			.map((cycles, i) => {
				const sec = (results.aggregate.scaling[key][cycles]?.elapsedMs ?? 0) / 1000;
				const x = scalingX(cycles);
				const y = scalingY(sec);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');

	// Axis ticks for scaling chart
	let scalingYTicks = $derived(
		[0, scalingMaxY * 0.25, scalingMaxY * 0.5, scalingMaxY * 0.75, scalingMaxY].map((v) =>
			Math.round(v)
		)
	);
</script>

<section class="perf-charts">
	<div class="legend">
		<span class="dot" style="background: {MODERN}"></span> svelte-p5
		<span class="dot" style="background: {LEGACY}"></span> p5-svelte (port)
	</div>

	<!-- Chart 1: foreground fps under ghost load -->
	{@render chart(
		'Foreground sketch FPS as retained instances accumulate',
		`After N mount/unmount cycles, this is the frame rate of the currently-visible sketch. Below ~25 retained instances both wrappers behave the same.`
	)}
	<svg
		viewBox="0 0 {ghostChartWidth} {ghostHeight}"
		class="chart"
		role="img"
		aria-label="Foreground FPS by ghost count"
	>
		<title>Foreground FPS by ghost count</title>
		{#each ghostKeys as count, i (count)}
			{@const m = results.aggregate.ghostFps.modern[count]?.mean ?? 0}
			{@const l = results.aggregate.ghostFps.legacy[count]?.mean ?? 0}
			{@const yBase = i * (ghostRowHeight + 16) + 12}
			{@const labelW = 80}
			{@const mW = (m / ghostMaxFps) * ghostBarAreaWidth}
			{@const lW = (l / ghostMaxFps) * ghostBarAreaWidth}
			<text x="0" y={yBase + ghostBarHeight} class="label" dominant-baseline="middle">
				{count} ghost{count === 1 ? '' : 's'}
			</text>
			<rect x={labelW} y={yBase} width={mW} height={ghostBarHeight} fill={MODERN} rx="2" />
			<text
				x={labelW + mW + 6}
				y={yBase + ghostBarHeight / 2}
				class="value"
				dominant-baseline="middle"
			>
				{m.toFixed(0)} fps
			</text>
			<rect
				x={labelW}
				y={yBase + ghostBarHeight + ghostGap}
				width={lW}
				height={ghostBarHeight}
				fill={LEGACY}
				rx="2"
			/>
			<text
				x={labelW + lW + 6}
				y={yBase + ghostBarHeight + ghostGap + ghostBarHeight / 2}
				class="value"
				dominant-baseline="middle"
			>
				{l.toFixed(0)} fps
			</text>
		{/each}
	</svg>

	<!-- Chart 2: lifecycle wall-clock at 500 cycles -->
	{@render chart(
		'Wall-clock for 500 mount/unmount cycles',
		`Stress test, well above any normal session. Useful for showing how the cost grows asymptotically; not how a real app behaves.`
	)}
	<svg viewBox="0 0 560 130" class="chart" role="img" aria-label="Lifecycle wall-clock comparison">
		<title>Lifecycle wall-clock comparison</title>
		<text x="0" y="32" class="label" dominant-baseline="middle">svelte-p5</text>
		<rect
			x="100"
			y="20"
			width={(lifecycleData.modern / lifecycleMax) * 420}
			height="24"
			fill={MODERN}
			rx="2"
		/>
		<text
			x={100 + (lifecycleData.modern / lifecycleMax) * 420 + 6}
			y="32"
			class="value"
			dominant-baseline="middle"
		>
			{lifecycleData.modern.toFixed(2)}s
		</text>

		<text x="0" y="82" class="label" dominant-baseline="middle">p5-svelte</text>
		<rect
			x="100"
			y="70"
			width={(lifecycleData.legacy / lifecycleMax) * 420}
			height="24"
			fill={LEGACY}
			rx="2"
		/>
		<text
			x={100 + (lifecycleData.legacy / lifecycleMax) * 420 + 6}
			y="82"
			class="value"
			dominant-baseline="middle"
		>
			{lifecycleData.legacy.toFixed(2)}s
		</text>
		<text x="100" y="118" class="caption">
			n={results.config.runs}, ±{lifecycleData.legacyStd.toFixed(2)}s on legacy, ±{lifecycleData.modernStd.toFixed(
				2
			)}s on svelte-p5
		</text>
	</svg>

	<!-- Chart 3: scaling sweep -->
	{@render chart(
		'Wall-clock vs cycle count',
		`Shows how the cost shape differs: roughly linear for svelte-p5, super-linear for the legacy port. The visible gap only opens up past a few hundred cycles.`
	)}
	<svg
		viewBox="0 0 {scalingChartW} {scalingChartH}"
		class="chart"
		role="img"
		aria-label="Scaling sweep"
	>
		<title>Scaling sweep: time vs cycle count</title>

		<!-- Y-axis grid + labels -->
		{#each scalingYTicks as tick (tick)}
			<line
				x1={scalingPad.left}
				x2={scalingChartW - scalingPad.right}
				y1={scalingY(tick)}
				y2={scalingY(tick)}
				stroke="#e2e8f0"
				stroke-width="1"
			/>
			<text
				x={scalingPad.left - 8}
				y={scalingY(tick)}
				class="axis"
				text-anchor="end"
				dominant-baseline="middle"
			>
				{tick}s
			</text>
		{/each}

		<!-- X-axis labels -->
		{#each scalingKeys as cycles (cycles)}
			<text
				x={scalingX(cycles)}
				y={scalingChartH - scalingPad.bottom + 18}
				class="axis"
				text-anchor="middle"
			>
				{cycles}
			</text>
		{/each}
		<text
			x={scalingPad.left + scalingPlotW / 2}
			y={scalingChartH - 6}
			class="axis-title"
			text-anchor="middle"
		>
			cycles
		</text>

		<!-- Modern line + points -->
		<path d={scalingPath('modern')} fill="none" stroke={MODERN} stroke-width="2.5" />
		{#each scalingKeys as cycles (cycles)}
			{@const sec = (results.aggregate.scaling.modern[cycles]?.elapsedMs ?? 0) / 1000}
			<circle cx={scalingX(cycles)} cy={scalingY(sec)} r="4" fill={MODERN} />
		{/each}

		<!-- Legacy line + points -->
		<path d={scalingPath('legacy')} fill="none" stroke={LEGACY} stroke-width="2.5" />
		{#each scalingKeys as cycles (cycles)}
			{@const sec = (results.aggregate.scaling.legacy[cycles]?.elapsedMs ?? 0) / 1000}
			<circle cx={scalingX(cycles)} cy={scalingY(sec)} r="4" fill={LEGACY} />
			<text x={scalingX(cycles)} y={scalingY(sec) - 10} class="value" text-anchor="middle">
				{sec.toFixed(1)}s
			</text>
		{/each}
	</svg>
</section>

{#snippet chart(title: string, caption: string)}
	<h3 class="chart-title">{title}</h3>
	<p class="chart-caption">{caption}</p>
{/snippet}

<style>
	.perf-charts {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
		background: rgb(248 250 252);
		border: 1px solid rgb(226 232 240);
		border-radius: 0.75rem;
		margin: 1.5rem 0 2rem;
	}
	.legend {
		display: flex;
		gap: 1.25rem;
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: rgb(71 85 105);
		align-items: center;
	}
	.dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		margin-right: 0.375rem;
		vertical-align: middle;
	}
	.chart {
		display: block;
		width: 100%;
		height: auto;
		max-width: 560px;
	}
	.chart-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: rgb(15 23 42);
		margin: 0.75rem 0 0.125rem;
	}
	.chart-caption {
		font-size: 0.8125rem;
		color: rgb(71 85 105);
		margin: 0 0 0.5rem;
		max-width: 56ch;
		line-height: 1.5;
	}
	.label {
		font-size: 12px;
		font-family: var(--font-mono);
		fill: rgb(71 85 105);
	}
	.value {
		font-size: 11px;
		font-family: var(--font-mono);
		fill: rgb(30 41 59);
		font-weight: 600;
	}
	.axis {
		font-size: 11px;
		font-family: var(--font-mono);
		fill: rgb(100 116 139);
	}
	.axis-title {
		font-size: 11px;
		font-family: var(--font-sans);
		fill: rgb(100 116 139);
		font-weight: 500;
	}
	.caption {
		font-size: 11px;
		font-family: var(--font-mono);
		fill: rgb(100 116 139);
	}
</style>
