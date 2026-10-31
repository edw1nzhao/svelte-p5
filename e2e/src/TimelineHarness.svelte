<script lang="ts">
	import { TimelineTrack } from 'svelte-p5-components';
	import type { TimelineE2EState } from './state.js';

	let currentTime = $state(10);
	let viewStart = $state<number | undefined>(undefined);
	let viewEnd = $state<number | undefined>(undefined);

	const probe: TimelineE2EState = { currentTime: 10, view: null };
	window.__timeline = probe;

	$effect(() => {
		probe.currentTime = currentTime;
		probe.view = viewStart === undefined ? null : { start: viewStart, end: viewEnd ?? 100 };
	});
</script>

<div id="timeline" style="width: 400px; margin: 40px;">
	<TimelineTrack duration={100} zoomable bind:currentTime bind:viewStart bind:viewEnd />
</div>
