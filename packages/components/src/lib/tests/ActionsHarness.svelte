<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Action, ActionRegistry, ActionSection } from '../action-registry.js';
	import CommandPalette from '../CommandPalette.svelte';
	import ShortcutCheatsheet from '../ShortcutCheatsheet.svelte';

	let {
		registry,
		recentKey,
		sections,
		onRun,
		onError,
		footer
	}: {
		registry: ActionRegistry;
		recentKey?: string;
		sections?: readonly ActionSection[];
		onRun?: (action: Action) => void;
		onError?: (error: unknown, action: Action) => void;
		footer?: Snippet;
	} = $props();

	let palette = $state(false);
	let sheet = $state(false);
</script>

<button type="button" onclick={() => (sheet = true)}>Show shortcuts</button>
<CommandPalette {registry} bind:open={palette} {recentKey} {sections} {onRun} {onError} />
<ShortcutCheatsheet {registry} bind:open={sheet} {sections} {footer} title="Keyboard Shortcuts" />
