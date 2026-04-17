<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { mount, unmount } from 'svelte';
	import CodeCopyBtn from './CodeCopyBtn.svelte';
	import PmTabBar from './PmTabBar.svelte';
	import { PKG_MANAGERS, type PkgManager } from '$lib/stores/preferences.svelte';

	let { html }: { html: string } = $props();

	let container: HTMLDivElement | null = $state(null);
	const instances: Array<ReturnType<typeof mount>> = [];

	function teardown() {
		while (instances.length) {
			const inst = instances.pop();
			try {
				if (inst) unmount(inst);
			} catch {
				// already gone
			}
		}
	}

	function attach() {
		if (!container) return;
		teardown();

		const blocks = container.querySelectorAll('figure.code-block');
		blocks.forEach((block) => {
			const el = block as HTMLElement;

			// Tabbed package-manager block: mount the tab bar (which owns its
			// own copy button), no plain copy button.
			if (el.classList.contains('pm-tabs')) {
				const mountTarget = el.querySelector<HTMLElement>('.pm-tabs-mount');
				if (!mountTarget) return;
				const sources = {} as Record<PkgManager, string>;
				let allFound = true;
				for (const pm of PKG_MANAGERS) {
					const src = el.dataset[`source${pm[0]!.toUpperCase()}${pm.slice(1)}`];
					if (!src) {
						allFound = false;
						break;
					}
					sources[pm] = src;
				}
				if (!allFound) return;
				const inst = mount(PmTabBar, {
					target: mountTarget,
					props: { figure: el, sources }
				});
				instances.push(inst);
				return;
			}

			// Standard code block: mount the floating copy button.
			const source = el.dataset.source ?? '';
			if (!source) return;
			const slot = document.createElement('div');
			slot.className = 'code-copy-slot';
			block.appendChild(slot);
			const inst = mount(CodeCopyBtn, { target: slot, props: { source } });
			instances.push(inst);
		});
	}

	onMount(() => {
		attach();
		return teardown;
	});

	// Re-attach when html changes (route change in same layout)
	$effect(() => {
		// Read html so the effect re-runs when it changes; defer attachment
		// to a microtask so the @html update has flushed into the DOM first.
		const _ = html;
		void _;
		untrack(() => {
			queueMicrotask(attach);
		});
	});
</script>

<div bind:this={container} class="prose-doc">
	{@html html}
</div>
