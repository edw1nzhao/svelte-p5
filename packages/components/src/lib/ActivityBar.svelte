<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/**
	 * One item rendered as an icon button in the rail.
	 */
	export interface ActivityBarItem {
		/** Stable id. Passed back via `onSelect` and used for `activeId`. */
		id: string;
		/** Snippet that renders the icon. Called with no arguments. */
		icon: Snippet;
		/** Accessible label + tooltip title. */
		label: string;
		/** Optional numeric badge rendered over the icon. */
		badge?: number;
	}
</script>

<script lang="ts">
	/**
	 * Vertical activity-bar rail (VS Code pattern). Renders a stack of
	 * square icon buttons wired into a `role="tablist"` group. One item
	 * can be "active"; callers own that state via the `activeId` prop.
	 *
	 * Visual contract: 48×48 square buttons. Active state renders an
	 * accent-colored left border + subtle background tint. Hover is a
	 * faint background. All class names are author-written (not scoped
	 * hashes) so consumers can safely target them via `:global(...)`:
	 *
	 *   .activity-bar
	 *   .activity-bar__item
	 *   .activity-bar__item--active
	 *   .activity-bar__badge
	 *
	 * Keyboard: Up/Down arrow moves focus between buttons (wraps); Enter
	 * or Space activates the focused item.
	 *
	 * @example
	 * ```svelte
	 * <ActivityBar
	 *   activeId={active}
	 *   items={[
	 *     { id: 'viz', label: 'Visualizations', icon: vizIcon },
	 *     { id: 'filters', label: 'Filters', icon: filtersIcon }
	 *   ]}
	 *   onSelect={(id) => (active = active === id ? undefined : id)}
	 * />
	 * ```
	 */
	interface Props {
		/** The items to render. */
		items: ActivityBarItem[];
		/**
		 * The id of the currently-active item. When undefined, no item
		 * shows the active treatment. Bindable.
		 */
		activeId?: string;
		/** Click / keyboard-activation callback. */
		onSelect?: (id: string) => void;
		/** Rail width in px. Default: 48. */
		width?: number;
		/**
		 * Rail orientation. Only `'vertical'` is supported today; the prop
		 * is kept so future work can add horizontal without breaking API.
		 */
		orientation?: 'vertical';
		class?: string;
	}

	let {
		items,
		activeId = $bindable<string | undefined>(undefined),
		onSelect,
		width = 48,
		orientation = 'vertical',
		class: className = ''
	}: Props = $props();

	let rootEl: HTMLDivElement | null = $state(null);

	function handleItemClick(id: string) {
		onSelect?.(id);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!rootEl) return;
		const buttons = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('.activity-bar__item'));
		if (buttons.length === 0) return;

		const current = document.activeElement as HTMLElement | null;
		const idx = current ? buttons.indexOf(current as HTMLButtonElement) : -1;

		if (event.key === 'ArrowDown' || (orientation === 'vertical' && event.key === 'ArrowRight')) {
			event.preventDefault();
			const next = idx < 0 ? 0 : (idx + 1) % buttons.length;
			buttons[next]?.focus();
		} else if (
			event.key === 'ArrowUp' ||
			(orientation === 'vertical' && event.key === 'ArrowLeft')
		) {
			event.preventDefault();
			const next = idx < 0 ? buttons.length - 1 : (idx - 1 + buttons.length) % buttons.length;
			buttons[next]?.focus();
		} else if (event.key === 'Enter' || event.key === ' ') {
			if (idx >= 0) {
				event.preventDefault();
				const id = items[idx]?.id;
				if (id) onSelect?.(id);
			}
		}
	}
</script>

<div
	bind:this={rootEl}
	class="activity-bar {className}"
	role="tablist"
	aria-orientation={orientation}
	style:width="{width}px"
	onkeydown={handleKeydown}
	tabindex="-1"
>
	{#each items as item (item.id)}
		{@const isActive = item.id === activeId}
		<button
			type="button"
			class="activity-bar__item {isActive ? 'activity-bar__item--active' : ''}"
			role="tab"
			aria-selected={isActive}
			aria-label={item.label}
			title={item.label}
			tabindex={isActive ? 0 : -1}
			onclick={() => handleItemClick(item.id)}
		>
			<span class="activity-bar__icon">
				{@render item.icon()}
			</span>
			{#if item.badge !== undefined && item.badge > 0}
				<span class="activity-bar__badge" aria-hidden="true">{item.badge}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.activity-bar {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		flex: 0 0 auto;
		height: 100%;
		background: var(--activity-bar-bg, #f3f3f3);
		border-right: 1px solid var(--activity-bar-border, rgba(0, 0, 0, 0.08));
		overflow: hidden;
	}

	.activity-bar__item {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		margin: 0;
		border: none;
		background: transparent;
		color: var(--activity-bar-fg, #555);
		cursor: pointer;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}

	.activity-bar__item:hover {
		background: var(--activity-bar-bg-hover, rgba(0, 0, 0, 0.05));
		color: var(--activity-bar-fg-hover, #111);
	}

	.activity-bar__item:focus-visible {
		outline: 2px solid var(--activity-bar-focus, rgba(59, 130, 246, 0.55));
		outline-offset: -2px;
	}

	.activity-bar__item--active {
		color: var(--activity-bar-fg-active, #111);
		background: var(--activity-bar-bg-active, rgba(59, 130, 246, 0.08));
	}

	.activity-bar__item--active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--activity-bar-accent, #3b82f6);
	}

	.activity-bar__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		pointer-events: none;
	}

	.activity-bar__badge {
		position: absolute;
		top: 6px;
		right: 6px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 8px;
		background: var(--activity-bar-badge-bg, #ef4444);
		color: var(--activity-bar-badge-fg, #fff);
		font:
			10px/16px system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
		font-weight: 600;
		text-align: center;
	}
</style>
