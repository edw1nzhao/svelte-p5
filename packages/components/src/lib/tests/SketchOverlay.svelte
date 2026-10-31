<script lang="ts">
	import type { SketchContext } from 'svelte-p5';
	import Sketch from '../Sketch.svelte';
	import FPSMonitor from '../FPSMonitor.svelte';
	import ContextProbe from './ContextProbe.svelte';

	type OnContext = (c: SketchContext | undefined) => void;
	let {
		onContext,
		onOutside,
		onReady
	}: { onContext: OnContext; onOutside: OnContext; onReady: (p: unknown) => void } = $props();
</script>

<Sketch sketch={() => {}} {onReady}>
	<ContextProbe {onContext} />
	<FPSMonitor />
</Sketch>
<ContextProbe onContext={onOutside} />
