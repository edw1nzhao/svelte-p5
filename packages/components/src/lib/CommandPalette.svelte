<script lang="ts" module>
	let nextId = 0;
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import {
		chordMatches,
		formatActionKeys,
		type Action,
		type ActionGroup,
		type ActionRegistry,
		type ActionSection,
		type KeyChord
	} from './action-registry.js';
	import { getHighlightSegments, searchActions, type HighlightSegment } from './fuzzy-search.js';
	import { createRecentActions, type RecentActions } from './recent-actions.js';

	/**
	 * Searchable list of a registry's actions, opened with a shortcut.
	 *
	 * An empty query shows recently run actions (when `recentKey` is set)
	 * followed by every non-hidden action, grouped. Typing fuzzy-matches label,
	 * description, keywords and group, best match first, grouped by the best
	 * match's group, with matched label characters marked.
	 *
	 * Keyboard (focus stays in the search box):
	 * - `openKeys` (default Cmd+K on macOS, Ctrl+K elsewhere) toggles the palette
	 * - Up / Down, Tab / Shift+Tab move the selection; Home / End jump to the ends
	 * - Enter runs the selected action; Escape closes
	 *
	 * Running an action closes the palette, returns focus to the element that
	 * had it before opening, then calls `action.run()` and `onRun(action)`.
	 *
	 * Public class-name contract (stable across versions):
	 *   .command-palette
	 *   .command-palette__backdrop
	 *   .command-palette__panel
	 *   .command-palette__search
	 *   .command-palette__search-icon
	 *   .command-palette__input
	 *   .command-palette__list
	 *   .command-palette__group
	 *   .command-palette__group-label
	 *   .command-palette__item
	 *   .command-palette__item--selected
	 *   .command-palette__item-icon
	 *   .command-palette__item-text
	 *   .command-palette__item-label
	 *   .command-palette__item-description
	 *   .command-palette__checked
	 *   .command-palette__kbd
	 *   .command-palette__empty
	 *   .command-palette__footer
	 *
	 * @example
	 * ```svelte
	 * <CommandPalette {registry} bind:open recentKey="my-app-recent" onRun={redraw} />
	 * ```
	 */
	interface Props {
		registry: ActionRegistry;
		/** Whether the palette is visible. Bindable. */
		open?: boolean;
		/** Search box placeholder, also its accessible name. */
		placeholder?: string;
		/** Accessible name of the dialog. */
		label?: string;
		/** `localStorage` key for recent actions. Without it there is no recent section. */
		recentKey?: string;
		/** Groups to show and their order. Default: every group, in registry order. */
		sections?: readonly ActionSection[];
		/** Called after an action runs from the palette. */
		onRun?: (action: Action) => void;
		/** When given, an action that throws is reported here and `onRun` is skipped. Without it the error propagates. */
		onError?: (error: unknown, action: Action) => void;
		/** Chords that toggle the palette from anywhere on the page. `[]` turns this off. */
		openKeys?: readonly KeyChord[];
		class?: string;
	}

	let {
		registry,
		open = $bindable(false),
		placeholder = 'Search commands...',
		label = 'Command palette',
		recentKey,
		sections,
		onRun,
		onError,
		openKeys = [{ key: 'k', mod: true }],
		class: className = ''
	}: Props = $props();

	const uid = `command-palette-${nextId++}`;
	const listId = `${uid}-list`;

	let query = $state('');
	let selectedIndex = $state(0);
	let recentIds = $state<string[]>([]);
	let inputEl: HTMLInputElement | null = $state(null);
	let listEl: HTMLDivElement | null = $state(null);
	let restoreTarget: HTMLElement | null = null;

	const recents: RecentActions | null = $derived(recentKey ? createRecentActions(recentKey) : null);
	const visible = $derived(registry.list().filter((action) => !action.hidden));
	const searching = $derived(query.trim() !== '');
	const results = $derived(searching ? searchActions(query, visible) : []);

	const recentActions = $derived(
		searching
			? []
			: recentIds.flatMap((id) => {
					const action = registry.get(id);
					return action && !action.hidden ? [action] : [];
				})
	);

	const groups: ActionGroup[] = $derived.by(() => {
		const actions = searching ? results.map((result) => result.action) : visible;
		const grouped = registry.groups({ actions, sections });
		return recentActions.length > 0
			? [{ id: '', label: 'Recent', actions: recentActions }, ...grouped]
			: grouped;
	});

	const rows = $derived(groups.flatMap((group) => group.actions));

	const highlights = $derived(
		new Map(
			results.flatMap((result): [string, HighlightSegment[]][] =>
				result.field === 'label'
					? [[result.action.id, getHighlightSegments(result.action.label, result.match.indices)]]
					: []
			)
		)
	);

	function offsetOf(groupIndex: number): number {
		let offset = 0;
		for (let i = 0; i < groupIndex; i++) offset += groups[i]?.actions.length ?? 0;
		return offset;
	}

	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	$effect.pre(() => {
		if (!open) return;
		untrack(() => {
			const active = document.activeElement;
			restoreTarget = active instanceof HTMLElement ? active : null;
			query = '';
			selectedIndex = 0;
			recentIds = recents?.list().map((entry) => entry.id) ?? [];
		});
		return restoreFocus;
	});

	$effect(() => {
		if (open) untrack(() => inputEl)?.focus();
	});

	$effect(() => {
		if (!open || !listEl) return;
		const row = listEl.querySelector(`#${optionId(selectedIndex)}`);
		row?.scrollIntoView({ block: 'nearest' });
	});

	$effect(() => {
		if (openKeys.length === 0) return;
		const chords = openKeys;
		const mac = registry.mac;
		const onKeydown = (event: KeyboardEvent) => {
			if (!chords.some((chord) => chordMatches(chord, event, { mac }))) return;
			event.preventDefault();
			event.stopPropagation();
			open = !open;
		};
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	function restoreFocus() {
		const target = restoreTarget;
		restoreTarget = null;
		if (target?.isConnected) target.focus({ preventScroll: true });
	}

	function close() {
		open = false;
		restoreFocus();
	}

	function runAction(action: Action) {
		close();
		recents?.add(action.id);
		if (onError) {
			try {
				action.run();
			} catch (error) {
				onError(error, action);
				return;
			}
		} else {
			action.run();
		}
		onRun?.(action);
	}

	function move(to: number) {
		selectedIndex = Math.max(0, Math.min(to, rows.length - 1));
	}

	function onKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				close();
				return;
			case 'ArrowDown':
				event.preventDefault();
				move(selectedIndex + 1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				move(selectedIndex - 1);
				return;
			case 'Tab':
				event.preventDefault();
				move(selectedIndex + (event.shiftKey ? -1 : 1));
				return;
			case 'Home':
				event.preventDefault();
				move(0);
				return;
			case 'End':
				event.preventDefault();
				move(rows.length - 1);
				return;
			case 'Enter': {
				event.preventDefault();
				const action = rows[selectedIndex];
				if (action) runAction(action);
				return;
			}
		}
	}
</script>

{#if open}
	<div class="command-palette {className}">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="command-palette__backdrop" onclick={close}></div>
		<div
			class="command-palette__panel"
			role="dialog"
			aria-modal="true"
			aria-label={label}
			tabindex="-1"
			onkeydown={onKeydown}
		>
			<div class="command-palette__search">
				<svg
					class="command-palette__search-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={() => (selectedIndex = 0)}
					class="command-palette__input"
					type="text"
					{placeholder}
					aria-label={placeholder}
					autocomplete="off"
					spellcheck="false"
					role="combobox"
					aria-expanded="true"
					aria-autocomplete="list"
					aria-controls={listId}
					aria-activedescendant={rows[selectedIndex] ? optionId(selectedIndex) : undefined}
				/>
				<kbd class="command-palette__kbd">Esc</kbd>
			</div>

			<div
				bind:this={listEl}
				id={listId}
				class="command-palette__list"
				role="listbox"
				aria-label={label}
			>
				{#if searching && rows.length === 0}
					<div class="command-palette__empty" role="presentation">
						No commands found for "{query}"
					</div>
				{/if}
				{#each groups as group, groupIndex (`${groupIndex}:${group.id}`)}
					{@const offset = offsetOf(groupIndex)}
					{@const headingId = `${uid}-group-${groupIndex}`}
					<div
						class="command-palette__group"
						role="group"
						aria-labelledby={group.label ? headingId : undefined}
					>
						{#if group.label}
							<div id={headingId} class="command-palette__group-label" role="presentation">
								{group.label}
							</div>
						{/if}
						{#each group.actions as action, i (action.id)}
							{@const index = offset + i}
							{@const segments = searching ? highlights.get(action.id) : undefined}
							{@const keys = formatActionKeys(action, { mac: registry.mac })}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								id={optionId(index)}
								class="command-palette__item"
								class:command-palette__item--selected={index === selectedIndex}
								role="option"
								tabindex="-1"
								aria-selected={index === selectedIndex}
								onclick={() => runAction(action)}
								onmousemove={() => (selectedIndex = index)}
							>
								{#if action.icon}
									<span class="command-palette__item-icon" aria-hidden="true">
										{#if typeof action.icon === 'string'}{action.icon}{:else}{@render action.icon()}{/if}
									</span>
								{/if}
								<span class="command-palette__item-text">
									<span class="command-palette__item-label">
										{#if segments}
											{#each segments as segment, s (s)}
												{#if segment.highlighted}<mark>{segment.text}</mark
													>{:else}{segment.text}{/if}
											{/each}
										{:else}
											{action.label}
										{/if}
									</span>
									{#if action.description}
										<span class="command-palette__item-description">{action.description}</span>
									{/if}
								</span>
								{#if action.checked?.()}
									<span class="command-palette__checked">active</span>
								{/if}
								{#each keys as text (text)}
									<kbd class="command-palette__kbd">{text}</kbd>
								{/each}
							</div>
						{/each}
					</div>
				{/each}
			</div>

			<div class="command-palette__footer" aria-hidden="true">
				<span><kbd class="command-palette__kbd">↑↓</kbd> Navigate</span>
				<span><kbd class="command-palette__kbd">Enter</kbd> Select</span>
				<span><kbd class="command-palette__kbd">Esc</kbd> Close</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.command-palette {
		position: fixed;
		inset: 0;
		z-index: var(--command-palette-z-index, 1200);
		font:
			14px/1.4 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
	}

	.command-palette__backdrop {
		position: absolute;
		inset: 0;
		background: var(--command-palette-backdrop, rgba(0, 0, 0, 0.5));
		backdrop-filter: var(--command-palette-backdrop-filter, none);
		animation: command-palette-fade 150ms ease-out;
	}

	.command-palette__panel {
		position: absolute;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		width: min(var(--command-palette-width, 42rem), calc(100vw - 2rem));
		display: flex;
		flex-direction: column;
		max-height: 70vh;
		overflow: hidden;
		background: var(--command-palette-bg, #ffffff);
		color: var(--command-palette-fg, #111111);
		border: 1px solid var(--command-palette-border, rgba(0, 0, 0, 0.12));
		border-radius: var(--command-palette-radius, 12px);
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
		outline: none;
		animation: command-palette-in 200ms ease-out;
	}

	@keyframes command-palette-fade {
		from {
			opacity: 0;
		}
	}

	@keyframes command-palette-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.command-palette__backdrop,
		.command-palette__panel {
			animation: none;
		}
	}

	.command-palette__search {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--command-palette-border, rgba(0, 0, 0, 0.12));
	}

	.command-palette__search-icon {
		flex: 0 0 auto;
		width: 20px;
		height: 20px;
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.command-palette__input {
		flex: 1 1 auto;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 16px;
	}

	.command-palette__input::placeholder {
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.command-palette__list {
		flex: 1 1 auto;
		overflow-y: auto;
		max-height: 24rem;
	}

	.command-palette__group {
		padding: 8px 0;
	}

	.command-palette__group-label {
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.command-palette__item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		cursor: pointer;
	}

	.command-palette__item:hover {
		background: var(--command-palette-item-hover-bg, rgba(0, 0, 0, 0.05));
	}

	.command-palette__item--selected,
	.command-palette__item--selected:hover {
		background: var(--command-palette-item-selected-bg, rgba(0, 0, 0, 0.08));
	}

	.command-palette__item-icon {
		flex: 0 0 auto;
		font-size: 20px;
		line-height: 1;
	}

	.command-palette__item-text {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-width: 0;
	}

	.command-palette__item-label {
		font-weight: 500;
	}

	.command-palette__item-label mark {
		padding: 0 2px;
		border-radius: 3px;
		background: var(--command-palette-accent, #16a34a);
		color: var(--command-palette-accent-fg, #ffffff);
	}

	.command-palette__item-description {
		font-size: 13px;
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.command-palette__checked {
		flex: 0 0 auto;
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 12px;
		background: var(--command-palette-accent, #16a34a);
		color: var(--command-palette-accent-fg, #ffffff);
	}

	.command-palette__kbd {
		flex: 0 0 auto;
		padding: 1px 6px;
		border: 1px solid var(--command-palette-kbd-border, rgba(0, 0, 0, 0.15));
		border-radius: 4px;
		background: var(--command-palette-kbd-bg, rgba(0, 0, 0, 0.04));
		color: var(--command-palette-kbd-fg, inherit);
		font:
			12px/1.4 ui-monospace,
			SFMono-Regular,
			Menlo,
			Consolas,
			monospace;
	}

	.command-palette__empty {
		padding: 32px 16px;
		text-align: center;
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.command-palette__footer {
		display: flex;
		justify-content: center;
		gap: 16px;
		padding: 8px 16px;
		border-top: 1px solid var(--command-palette-border, rgba(0, 0, 0, 0.12));
		font-size: 12px;
		color: var(--command-palette-muted-fg, rgba(0, 0, 0, 0.6));
	}
</style>
