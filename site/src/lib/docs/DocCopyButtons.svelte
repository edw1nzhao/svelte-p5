<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { mount, unmount } from 'svelte';
	import CodeCopyBtn from './CodeCopyBtn.svelte';

	let { html }: { html: string } = $props();

	let container: HTMLDivElement | null = $state(null);
	const buttonInstances: Array<ReturnType<typeof mount>> = [];

	function attachButtons() {
		if (!container) return;

		// Tear down any previously-mounted buttons (route changes)
		while (buttonInstances.length) {
			const inst = buttonInstances.pop();
			try {
				if (inst) unmount(inst);
			} catch {
				// already gone
			}
		}

		const blocks = container.querySelectorAll('figure.code-block');
		blocks.forEach((block) => {
			const source = (block as HTMLElement).dataset.source ?? '';
			if (!source) return;

			const slot = document.createElement('div');
			slot.className = 'code-copy-slot';
			block.appendChild(slot);

			const inst = mount(CodeCopyBtn, { target: slot, props: { source } });
			buttonInstances.push(inst);
		});
	}

	onMount(() => {
		attachButtons();
		return () => {
			while (buttonInstances.length) {
				const inst = buttonInstances.pop();
				try {
					if (inst) unmount(inst);
				} catch {
					// noop
				}
			}
		};
	});

	// Re-attach when html changes (route change in same layout)
	$effect(() => {
		// Read html so the effect re-runs when it changes; defer attachment
		// to a microtask so the @html update has flushed into the DOM first.
		const _ = html;
		void _;
		untrack(() => {
			queueMicrotask(attachButtons);
		});
	});
</script>

<div bind:this={container} class="prose-doc">
	{@html html}
</div>
