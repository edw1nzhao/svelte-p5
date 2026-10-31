<script lang="ts">
	import { onMount } from 'svelte';
	import type { EditorView } from '@codemirror/view';

	let {
		value = $bindable(''),
		label,
		describedBy,
		onRun
	}: { value?: string; label: string; describedBy?: string; onRun: () => void } = $props();

	let host: HTMLDivElement | null = $state(null);
	let view: EditorView | null = $state(null);
	let replaceDoc: ((view: EditorView, doc: string) => void) | null = null;

	onMount(() => {
		let cancelled = false;
		let created: EditorView | null = null;
		import('./codemirror.js').then((cm) => {
			if (cancelled || !host) return;
			replaceDoc = cm.replaceDoc;
			created = cm.createEditor({
				parent: host,
				doc: value,
				label,
				describedBy,
				onChange: (doc) => (value = doc),
				onRun: () => onRun()
			});
			view = created;
		});
		return () => {
			cancelled = true;
			created?.destroy();
		};
	});

	$effect(() => {
		if (view && replaceDoc && value !== view.state.doc.toString()) replaceDoc(view, value);
	});
</script>

<div bind:this={host} class="h-full min-h-0">
	{#if !view}
		<pre
			class="m-0 h-full overflow-auto p-4 pl-12 font-mono text-sm leading-relaxed text-fg-subtle"
			aria-busy="true"
			aria-label="Loading editor">{value}</pre>
	{/if}
</div>
