<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { createP5Bridge, downloadCanvas } from 'svelte-p5';
	import { Sketch } from 'svelte-p5-components';
	import type p5 from 'p5';
	import { Play, Link, FileCode, Download } from '@lucide/svelte';
	import CodeEditor from '#lib/playground/CodeEditor.svelte';
	import { BRIDGE_DEFAULTS, BRIDGE_RANGES, type LoopMode } from '#lib/playground/bridge.js';
	import { DEFAULT_EXAMPLE, EXAMPLES } from '#lib/playground/examples.js';
	import {
		compileSketch,
		fromUserCode,
		instrument,
		toSketchError,
		type SketchError
	} from '#lib/playground/runner.js';
	import {
		decodeSketch,
		encodeSketch,
		readShareSettings,
		readShareToken,
		shareHash
	} from '#lib/playground/share.js';
	import { toSvelteComponent } from '#lib/playground/svelte-export.js';
	import Seo from '#lib/components/Seo.svelte';

	const AUTO_RUN_DELAY = 800;

	const bridge = createP5Bridge({ ...BRIDGE_DEFAULTS });

	let code = $state(DEFAULT_EXAMPLE.code);
	let exampleId = $state(DEFAULT_EXAMPLE.id);
	let sharedLoop = $state<LoopMode>('always');
	let sketch: ((p: p5) => void) | null = $state(null);
	let runId = $state(0);
	let error: SketchError | null = $state(null);
	let sharedPending = $state(false);
	let autoRun = $state(true);
	let armed = $state(false);
	let announcement = $state('');
	let linkError = $state(false);
	let modKey = $state('Ctrl');
	let instance = $state<p5 | null>(null);
	let framesDrawn = $state(0);

	let lastRunCode = '';
	let writtenToken: string | null = null;

	function run() {
		sharedPending = false;
		linkError = false;
		armed = true;
		lastRunCode = code;
		const compiled = compileSketch<typeof bridge>(code);
		if (!compiled.ok) {
			error = compiled.error;
			return;
		}
		error = null;
		const id = runId + 1;
		sketch = instrument(compiled.fn, bridge, (e) => {
			if (id === runId) error = e;
		});
		runId = id;
	}

	function loadExample(id: string) {
		const example = EXAMPLES.find((e) => e.id === id);
		if (!example) return;
		exampleId = id;
		code = example.code;
		if (readShareToken(location.hash)) void replaceState(location.pathname, {});
		run();
	}

	async function loadShared(token: string) {
		try {
			code = await decodeSketch(token);
			const settings = readShareSettings(location.hash);
			sharedLoop = settings.loop;
			Object.assign(bridge.state, settings.bridge);
			exampleId = '';
			sketch = null;
			error = null;
			sharedPending = true;
		} catch {
			linkError = true;
		}
	}

	async function copyText(text: string, done: string) {
		try {
			await navigator.clipboard.writeText(text);
			announcement = done;
		} catch {
			announcement = 'Copy failed. Your browser blocked clipboard access.';
		}
	}

	async function copyLink() {
		const token = await encodeSketch(code);
		writtenToken = token;
		const settings = { loop, bridge: $state.snapshot(bridge.state) };
		const url = `${location.origin}${location.pathname}${shareHash(token, settings)}`;
		await replaceState(url, {});
		await copyText(url, 'Link copied. Opening it shows this sketch, ready to run.');
	}

	function copyComponent() {
		void copyText(
			toSvelteComponent(code, $state.snapshot(bridge.state), loop),
			'Svelte component copied.'
		);
	}

	function onHashChange() {
		const token = readShareToken(location.hash);
		if (token && token !== writtenToken) void loadShared(token);
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.defaultPrevented) {
			e.preventDefault();
			run();
		}
	}

	function onUncaught(err: unknown) {
		if (sketch && fromUserCode(err)) error = toSketchError(err);
	}

	onMount(() => {
		if (/Mac|iPhone|iPad/.test(navigator.userAgent)) modKey = '⌘';
		const token = readShareToken(location.hash);
		const wanted = new URLSearchParams(location.search).get('example');
		if (token) void loadShared(token).then(() => linkError && run());
		else if (wanted && EXAMPLES.some((e) => e.id === wanted)) loadExample(wanted);
		else run();

		const onError = (e: ErrorEvent) => onUncaught(e.error);
		const onRejection = (e: PromiseRejectionEvent) => onUncaught(e.reason);
		window.addEventListener('error', onError);
		window.addEventListener('unhandledrejection', onRejection);
		return () => {
			window.removeEventListener('error', onError);
			window.removeEventListener('unhandledrejection', onRejection);
		};
	});

	$effect(() => {
		const current = code;
		if (!autoRun || !armed || current === lastRunCode) return;
		const timer = setTimeout(run, AUTO_RUN_DELAY);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!announcement) return;
		const timer = setTimeout(() => (announcement = ''), 4000);
		return () => clearTimeout(timer);
	});

	const loop = $derived(
		exampleId ? (EXAMPLES.find((e) => e.id === exampleId)?.loop ?? 'always') : sharedLoop
	);

	$effect(() => {
		const p = instance;
		if (!p) return;
		const timer = setInterval(() => (framesDrawn = p.frameCount), 250);
		return () => clearInterval(timer);
	});

	async function exportPng() {
		if (!instance) return;
		try {
			await downloadCanvas(instance, { scale: 2, filename: 'playground-sketch.png' });
			announcement = 'Exported the canvas at twice its size.';
		} catch (err) {
			announcement = `Export failed: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	let status = $derived(
		sharedPending ? 'Waiting for Run' : error ? 'Error' : sketch ? 'Running' : 'Stopped'
	);

	const buttonBase =
		'press inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
	const secondary = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
	const primary = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`;
</script>

<Seo
	title="Playground - svelte-p5"
	description="Edit a p5.js sketch in the browser and run it live through svelte-p5, with Svelte controls bound to the sketch through createP5Bridge."
/>

<svelte:window onhashchange={onHashChange} onkeydown={onWindowKeydown} />

<main id="main" class="bg-white min-h-dvh" style="padding-top: var(--header-h);">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
		<header class="mb-6">
			<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Playground</h1>
			<p class="mt-2 max-w-2xl text-base text-slate-600" style="text-wrap: pretty;">
				Edit an instance-mode p5 sketch and run it through svelte-p5's
				<code class="inline">&lt;Sketch&gt;</code>. The controls under the canvas are Svelte state
				shared with the sketch by <code class="inline">createP5Bridge</code>.
			</p>
		</header>

		<div class="flex flex-wrap items-end gap-3 mb-4" role="toolbar" aria-label="Playground actions">
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				Example
				<select
					value={exampleId}
					onchange={(e) => loadExample(e.currentTarget.value)}
					class="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
				>
					{#if !exampleId}
						<option value="" disabled>Shared sketch</option>
					{/if}
					{#each EXAMPLES as example (example.id)}
						<option value={example.id}>{example.label}</option>
					{/each}
				</select>
			</label>

			<button
				type="button"
				class={primary}
				onclick={run}
				aria-keyshortcuts="Control+Enter Meta+Enter"
			>
				<Play class="size-4" aria-hidden="true" />
				Run
				<kbd class="hidden sm:inline font-mono text-xs text-indigo-100">{modKey}+Enter</kbd>
			</button>

			<label class="inline-flex items-center gap-2 h-10 text-sm text-slate-700">
				<input type="checkbox" bind:checked={autoRun} class="size-4 accent-indigo-600" />
				Auto-run on edit
			</label>

			<div class="flex flex-wrap gap-3 sm:ml-auto">
				<button type="button" class={secondary} onclick={copyLink}>
					<Link class="size-4" aria-hidden="true" />
					Copy link
				</button>
				<button type="button" class={secondary} onclick={copyComponent}>
					<FileCode class="size-4" aria-hidden="true" />
					Copy as Svelte component
				</button>
			</div>
		</div>

		<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
		{#if announcement}
			<p class="mb-4 text-sm text-slate-600" aria-hidden="true">{announcement}</p>
		{/if}

		{#if linkError}
			<p
				class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
				role="alert"
			>
				This share link is damaged and could not be read, so the default example is shown.
			</p>
		{/if}

		{#if sharedPending}
			<div
				class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
				role="status"
			>
				<p class="m-0 flex-1 min-w-48">
					Loaded a shared sketch. Read the code, then press Run to start it.
				</p>
				<button type="button" class={primary} onclick={run}>
					<Play class="size-4" aria-hidden="true" />
					Run shared sketch
				</button>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<section aria-labelledby="pg-code" class="flex min-w-0 flex-col gap-2">
				<div class="flex items-baseline justify-between gap-3">
					<h2 id="pg-code" class="text-sm font-semibold text-slate-900">Code</h2>
					<span class="font-mono text-xs text-slate-500 truncate"
						>(p, bridge) =&gt; &#123; … &#125;</span
					>
				</div>
				<div
					class="h-[45svh] min-h-64 lg:h-auto lg:min-h-[28rem] lg:flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30"
				>
					<CodeEditor
						bind:value={code}
						label="Sketch code"
						describedBy="pg-editor-help"
						onRun={run}
					/>
				</div>
				<p id="pg-editor-help" class="text-xs text-slate-600">
					{modKey}+Enter runs the sketch. Press Esc, then Tab, to move focus out of the editor.
				</p>
			</section>

			<section aria-labelledby="pg-preview" class="flex min-w-0 flex-col gap-2">
				<div class="flex items-baseline justify-between gap-3">
					<h2 id="pg-preview" class="text-sm font-semibold text-slate-900">Preview</h2>
					<span
						class="text-xs font-medium"
						class:text-red-700={status === 'Error'}
						class:text-emerald-700={status === 'Running'}
						class:text-slate-600={status !== 'Error' && status !== 'Running'}
						data-testid="pg-status">{status}</span
					>
				</div>
				<div
					class="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
					data-testid="pg-stage"
				>
					{#if sketch}
						{#key runId}
							<Sketch
								{sketch}
								{loop}
								{bridge}
								bind:instance
								style="position: absolute; inset: 0; overflow: hidden;"
							/>
						{/key}
					{:else}
						<p
							class="absolute inset-0 m-0 grid place-items-center p-4 text-center text-sm text-slate-600"
						>
							{sharedPending
								? 'Press Run to start the shared sketch.'
								: 'Press Run to start the sketch.'}
						</p>
					{/if}
				</div>

				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="m-0 text-xs text-slate-600">
						Frames drawn: <output class="tabular-nums" data-testid="pg-frames">{framesDrawn}</output
						>
						{#if loop === 'demand'}<span>(loop="demand")</span>{/if}
					</p>
					<button type="button" class={secondary} onclick={exportPng} disabled={!instance}>
						<Download class="size-4" aria-hidden="true" />
						Export PNG
					</button>
				</div>

				{#if error}
					<div
						role="alert"
						class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
					>
						<p class="m-0 font-semibold">
							{error.kind === 'syntax' ? 'Syntax error' : 'Runtime error'}{error.line
								? ` on line ${error.line}`
								: ''}
						</p>
						<p class="m-0 mt-1 font-mono text-xs break-words" data-testid="pg-error">
							{error.message}
						</p>
						{#if error.kind === 'syntax' && sketch}
							<p class="m-0 mt-1 text-xs text-red-800">The last working sketch is still shown.</p>
						{/if}
					</div>
				{/if}

				<fieldset class="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 pt-2 pb-4">
					<legend class="px-1 text-sm font-semibold text-slate-900">
						Bridge state <span class="font-normal text-slate-600">(Svelte → sketch)</span>
					</legend>
					<p class="m-0 mb-3 text-xs text-slate-600">
						Read these in the sketch as <code class="inline">bridge.state.color</code>,
						<code class="inline">.size</code> and <code class="inline">.speed</code>.
					</p>
					<div class="grid gap-4 sm:grid-cols-3">
						<label class="flex flex-col gap-1 text-sm text-slate-700">
							<span class="font-mono text-xs">color</span>
							<input
								type="color"
								bind:value={bridge.state.color}
								class="h-10 w-full cursor-pointer rounded-md border border-slate-300 bg-white p-1"
							/>
						</label>
						<label class="flex flex-col gap-1 text-sm text-slate-700">
							<span class="flex justify-between font-mono text-xs">
								size <output class="tabular-nums text-slate-600">{bridge.state.size}</output>
							</span>
							<input
								type="range"
								min={BRIDGE_RANGES.size.min}
								max={BRIDGE_RANGES.size.max}
								step={BRIDGE_RANGES.size.step}
								bind:value={bridge.state.size}
								class="h-10 w-full accent-indigo-600"
							/>
						</label>
						<label class="flex flex-col gap-1 text-sm text-slate-700">
							<span class="flex justify-between font-mono text-xs">
								speed <output class="tabular-nums text-slate-600"
									>{bridge.state.speed.toFixed(1)}</output
								>
							</span>
							<input
								type="range"
								min={BRIDGE_RANGES.speed.min}
								max={BRIDGE_RANGES.speed.max}
								step={BRIDGE_RANGES.speed.step}
								bind:value={bridge.state.speed}
								class="h-10 w-full accent-indigo-600"
							/>
						</label>
					</div>
				</fieldset>
			</section>
		</div>
	</div>
</main>
