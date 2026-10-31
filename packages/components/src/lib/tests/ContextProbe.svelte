<script lang="ts">
	import { untrack } from 'svelte';
	import { getSketchContext, type SketchContext } from 'svelte-p5';

	let { onContext }: { onContext: (context: SketchContext | undefined) => void } = $props();
	const context = getSketchContext();
	untrack(() => onContext(context));
</script>
