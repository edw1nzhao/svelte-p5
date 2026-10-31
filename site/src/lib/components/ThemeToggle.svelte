<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';

	let dark = $state(false);

	function saved(): string | null {
		try {
			return localStorage.getItem('theme');
		} catch {
			return null;
		}
	}

	function apply(next: boolean) {
		dark = next;
		const root = document.documentElement;
		root.dataset.theme = next ? 'dark' : 'light';
		root.dataset.pfTheme = root.dataset.theme;
	}

	function toggle() {
		apply(!dark);
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			// Storage blocked: the choice lasts for this page only.
		}
	}

	onMount(() => {
		dark = document.documentElement.dataset.theme === 'dark';
		const media = matchMedia('(prefers-color-scheme: dark)');
		const follow = (e: MediaQueryListEvent) => {
			if (!saved()) apply(e.matches);
		};
		media.addEventListener('change', follow);
		return () => media.removeEventListener('change', follow);
	});
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Dark theme"
	aria-pressed={dark}
	class="size-10 inline-flex items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg hover:bg-panel-2"
>
	{#if dark}
		<Moon class="size-5" aria-hidden="true" />
	{:else}
		<Sun class="size-5" aria-hidden="true" />
	{/if}
</button>
