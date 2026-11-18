<script lang="ts">
	import { TimelineTrack } from 'svelte-p5-components';
	import type { TimelineE2EState } from './state.js';

	let currentTime = $state(10);
	let viewStart = $state<number | undefined>(undefined);
	let viewEnd = $state<number | undefined>(undefined);

	const withSelection = new URLSearchParams(window.location.search).has('selection');

	const probe: TimelineE2EState = { currentTime: 10, view: null };
	window.__timeline = probe;

	$effect(() => {
		probe.currentTime = currentTime;
		probe.view = viewStart === undefined ? null : { start: viewStart, end: viewEnd ?? 100 };
	});
</script>

<div id="timeline" style="width: 400px; margin: 40px;">
	{#if withSelection}
		<TimelineTrack
			duration={100}
			bind:currentTime
			selectionStart={20}
			selectionEnd={60}
			showSelection
		/>
	{:else}
		<TimelineTrack duration={100} zoomable bind:currentTime bind:viewStart bind:viewEnd />
	{/if}
</div>
