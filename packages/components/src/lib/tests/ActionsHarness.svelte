<script lang="ts">
	import type { Action, ActionRegistry, ActionSection } from '../action-registry.js';
	import CommandPalette from '../CommandPalette.svelte';
	import ShortcutCheatsheet from '../ShortcutCheatsheet.svelte';

	let {
		registry,
		recentKey,
		sections,
		onRun
	}: {
		registry: ActionRegistry;
		recentKey?: string;
		sections?: readonly ActionSection[];
		onRun?: (action: Action) => void;
	} = $props();

	let palette = $state(false);
	let sheet = $state(false);
</script>

<button type="button" onclick={() => (sheet = true)}>Show shortcuts</button>
<CommandPalette {registry} bind:open={palette} {recentKey} {sections} {onRun} />
<ShortcutCheatsheet {registry} bind:open={sheet} {sections} title="Keyboard Shortcuts" />
