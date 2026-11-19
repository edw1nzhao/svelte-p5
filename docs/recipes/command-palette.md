# Shortcuts and a command palette

`svelte-p5-components/actions` turns one list of actions into keyboard shortcuts, a <kbd>Cmd</kbd>+<kbd>K</kbd> command palette and a shortcut cheatsheet. Each action is declared once, so a shortcut, a palette row and a cheatsheet line cannot drift apart. Neither entry has p5 code or adds dependencies.

The package splits this across two entries:

- `svelte-p5-components/actions` is plain TypeScript: the types, `createActionRegistry`, the key helpers, `attachActionKeys`, fuzzy search and the recent-actions store. It imports no `.svelte` file, so a Node unit test of your registry needs no Svelte plugin.
- `svelte-p5-components/actions/ui` has the two components, `<CommandPalette>` and `<ShortcutCheatsheet>`.

## Declare the actions

<!-- snippet: declare const state = stub<{ trails: boolean; playing: boolean; rate: number }>(); const history = stub<{ undo(): void }>(); -->

```ts
// actions.ts
import { createActionRegistry, type Action } from 'svelte-p5-components/actions';

const actions: Action[] = [
	{
		id: 'toggle-trails',
		label: 'Toggle Movement Trails',
		description: 'Show or hide movement paths',
		keywords: ['paths', 'lines'],
		group: 'filter',
		keys: { key: 'm' },
		checked: () => state.trails,
		run: () => (state.trails = !state.trails)
	},
	{
		id: 'play',
		label: 'Play/Pause',
		group: 'playback',
		keys: { key: ' ' },
		run: () => (state.playing = !state.playing)
	},
	{
		id: 'speed-up',
		label: 'Speed Up',
		group: 'playback',
		keys: [{ key: '=' }, { key: '+' }],
		run: () => (state.rate += 0.1)
	},
	{
		id: 'undo',
		label: 'Undo',
		group: 'history',
		keys: { key: 'z', mod: true },
		hidden: true,
		run: () => history.undo()
	}
];

export const registry = createActionRegistry(actions, {
	groupLabels: { filter: 'Filter', playback: 'Playback', history: 'History' }
});
```

- `keys` takes one chord or an array; every chord runs the action.
- `mod: true` is <kbd>Cmd</kbd> on macOS and <kbd>Ctrl</kbd> elsewhere, so one chord covers both. Pass `mac` to `createActionRegistry` to pin the platform, for example in tests.
- <kbd>Ctrl</kbd>, <kbd>Alt</kbd> and <kbd>Meta</kbd> match exactly: `{ key: 'm' }` does not fire on <kbd>Ctrl</kbd>+<kbd>M</kbd>.
- Letters match either case, and <kbd>Shift</kbd> must match exactly. `{ key: 'z', mod: true, shift: true }` fires on <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> even though the browser reports the key as `'Z'`, and plain `{ key: 'z' }` does not fire while <kbd>Shift</kbd> is held.
- A single non-letter character (`+`, `?`, `=`, `/`, digits, punctuation) ignores <kbd>Shift</kbd> unless the chord sets `shift`, because layouts differ on which characters need it: `{ key: '+' }` fires on a US keyboard, where `+` arrives with <kbd>Shift</kbd> held. Named keys (`'ArrowLeft'`, `'Escape'`, `'Enter'`, `' '`) match <kbd>Shift</kbd> exactly.
- `checked` marks a toggle as on in the palette. `hidden` keeps an action out of the palette while its shortcut still works and the cheatsheet still lists it.
- Duplicate ids throw. Two actions that one keypress could fire do not: they are listed in `registry.conflicts`, and the first one registered wins. Conflicts use the matching rules above, so `{ key: '?' }` and `{ key: '?', shift: true }` conflict while `=` and `+` do not.

## Wire it up

<!-- snippet: declare const redraw = stub<() => void>(); -->

```svelte
<script lang="ts">
	import { attachActionKeys, type ActionSection } from 'svelte-p5-components/actions';
	import { CommandPalette, ShortcutCheatsheet } from 'svelte-p5-components/actions/ui';
	import { registry } from './actions.js';

	let paletteOpen = $state(false);
	let sheetOpen = $state(false);

	const sections: ActionSection[] = [
		{ id: 'playback', label: 'Playback' },
		{ id: 'data', label: 'Data', groups: ['filter', 'history'] }
	];

	$effect(() => attachActionKeys(registry, { onRun: redraw }));
</script>

<button onclick={() => (sheetOpen = true)}>Keyboard shortcuts</button>
<CommandPalette {registry} bind:open={paletteOpen} recentKey="my-app-recent" onRun={redraw} />
<ShortcutCheatsheet {registry} bind:open={sheetOpen} {sections} />
```

`attachActionKeys` adds one `keydown` listener to `document` and returns the function that removes it, which is what `$effect` wants. It skips keys typed into inputs, textareas, selects and contenteditable elements; pass `ignore` to change that, for example to also skip keys while a modal is open. A handled key has its default prevented and stops propagating unless the chord sets `preventDefault: false`. `onRun` fires after every action run from a shortcut; the palette has its own `onRun`. An action that throws propagates its error by default; pass `onError(error, action)` to `attachActionKeys` or the palette to catch and report it instead, in which case `onRun` is skipped for that run. To listen on one element instead of the page, attach `actionKeys(registry)` with `{@attach}`.

The cheatsheet's `footer` snippet renders in normal inline flow below the list, and a `<kbd>` inside it gets the cheatsheet's key-chip style: `{#snippet footer()}Press <kbd>?</kbd> anytime{/snippet}`.

The palette opens on <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd>; change that with `openKeys`, or pass `openKeys={[]}` and drive `open` yourself. With `recentKey` set it remembers the last five actions run from it in `localStorage` and lists them first while the query is empty.

## Grouping

Without `sections`, both components show every group in the order it first appears, headed by its `groupLabels` entry. `sections` picks and orders headings, and can merge several groups under one: above, the cheatsheet shows Playback, then a Data section holding the filter and history actions. A group no section names is left out.

`registry.groups({ sections, actions })` returns the same structure for building your own UI.

## Theming

Both components are plain CSS with custom properties, no framework. The palette reads `--command-palette-*` and the cheatsheet `--shortcut-cheatsheet-*`:

| suffix                           | what                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| `bg`, `fg`                       | panel background and text                                              |
| `muted-fg`                       | descriptions, group headings, hints                                    |
| `border`, `radius`               | panel border colour and corner radius                                  |
| `accent`                         | match highlight and toggle badge (palette), focus ring (cheatsheet)    |
| `accent-fg`                      | text on the accent (palette)                                           |
| `item-hover-bg`                  | row under the pointer (palette), close button (cheatsheet)             |
| `item-selected-bg`               | the selected row (palette)                                             |
| `kbd-bg`, `kbd-fg`, `kbd-border` | key chips                                                              |
| `backdrop`                       | the overlay behind the panel                                           |
| `backdrop-filter`                | `backdrop-filter` on that overlay, such as `blur(4px)`; default `none` |
| `z-index`, `width`               | stacking and panel width                                               |

```css
:root {
	--command-palette-accent: #15803d;
	--command-palette-radius: 16px;
	--shortcut-cheatsheet-width: 40rem;
}
```

Class names listed in each component's doc comment are stable across versions. Both respect `prefers-reduced-motion`.

## Accessibility

The palette is a `role="dialog"` named "Command palette" (the `label` prop) holding a combobox and a listbox. Focus stays in the search box and the selected row is announced through `aria-activedescendant`; groups are `role="group"` elements named by their heading. The cheatsheet is a dialog named by its `title`, with one heading per section. Both return focus to the element that had it when they opened.
