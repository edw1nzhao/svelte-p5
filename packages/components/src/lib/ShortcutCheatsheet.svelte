<script lang="ts" module>
	let nextId = 0;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { formatActionKeys, type ActionRegistry, type ActionSection } from './action-registry.js';

	/**
	 * Modal list of every action that has a shortcut, grouped. Each action
	 * appears once with all its chords; a `mod` chord shows the platform's key.
	 * Hidden actions are listed too: they are hidden from the palette only.
	 *
	 * Close affordances: Escape, the close button, a click on the backdrop,
	 * or the caller setting `open = false`. Focus moves to the close button on
	 * open, Tab cycles inside the dialog, and focus returns to the element
	 * that had it before opening.
	 *
	 * Public class-name contract (stable across versions):
	 *   .shortcut-cheatsheet
	 *   .shortcut-cheatsheet__backdrop
	 *   .shortcut-cheatsheet__panel
	 *   .shortcut-cheatsheet__header
	 *   .shortcut-cheatsheet__title
	 *   .shortcut-cheatsheet__close
	 *   .shortcut-cheatsheet__body
	 *   .shortcut-cheatsheet__section
	 *   .shortcut-cheatsheet__section-label
	 *   .shortcut-cheatsheet__list
	 *   .shortcut-cheatsheet__item
	 *   .shortcut-cheatsheet__item-label
	 *   .shortcut-cheatsheet__keys
	 *   .shortcut-cheatsheet__kbd
	 *   .shortcut-cheatsheet__empty
	 *   .shortcut-cheatsheet__footer
	 *
	 * @example
	 * ```svelte
	 * <ShortcutCheatsheet {registry} bind:open sections={[{ id: 'view', label: 'View' }]} />
	 * ```
	 */
	interface Props {
		registry: ActionRegistry;
		/** Whether the cheatsheet is visible. Bindable. */
		open?: boolean;
		/** Heading, also the dialog's accessible name. */
		title?: string;
		/** Accessible name of the close button. */
		closeLabel?: string;
		/** Sections to show and their order. Default: every group, in registry order. */
		sections?: readonly ActionSection[];
		/** Content under the list, such as a hint about the key that opens it. */
		footer?: Snippet;
		class?: string;
	}

	let {
		registry,
		open = $bindable(false),
		title = 'Keyboard shortcuts',
		closeLabel = 'Close',
		sections,
		footer,
		class: className = ''
	}: Props = $props();

	const titleId = `shortcut-cheatsheet-${nextId++}-title`;
	const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

	let panelEl: HTMLDivElement | null = $state(null);
	let restoreTarget: HTMLElement | null = null;

	const groups = $derived(registry.groups({ actions: registry.shortcuts(), sections }));

	$effect.pre(() => {
		if (!open) return;
		untrack(() => {
			const active = document.activeElement;
			restoreTarget = active instanceof HTMLElement ? active : null;
		});
		return restoreFocus;
	});

	$effect(() => {
		if (!open) return;
		untrack(() => panelEl)
			?.querySelector<HTMLElement>(FOCUSABLE)
			?.focus();
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

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}
		if (event.key !== 'Tab' || !panelEl) return;
		const focusable = [...panelEl.querySelectorAll<HTMLElement>(FOCUSABLE)];
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

{#if open}
	<div class="shortcut-cheatsheet {className}">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="shortcut-cheatsheet__backdrop" onclick={close}></div>
		<div
			bind:this={panelEl}
			class="shortcut-cheatsheet__panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			onkeydown={onKeydown}
		>
			<div class="shortcut-cheatsheet__header">
				<h2 id={titleId} class="shortcut-cheatsheet__title">{title}</h2>
				<button
					type="button"
					class="shortcut-cheatsheet__close"
					aria-label={closeLabel}
					onclick={close}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="shortcut-cheatsheet__body">
				{#each groups as group, groupIndex (`${groupIndex}:${group.id}`)}
					{@const headingId = `${titleId}-section-${groupIndex}`}
					<section
						class="shortcut-cheatsheet__section"
						aria-labelledby={group.label ? headingId : undefined}
					>
						{#if group.label}
							<h3 id={headingId} class="shortcut-cheatsheet__section-label">{group.label}</h3>
						{/if}
						<ul class="shortcut-cheatsheet__list">
							{#each group.actions as action (action.id)}
								<li class="shortcut-cheatsheet__item">
									<span class="shortcut-cheatsheet__item-label">{action.label}</span>
									<span class="shortcut-cheatsheet__keys">
										{#each formatActionKeys(action, { mac: registry.mac }) as text (text)}
											<kbd class="shortcut-cheatsheet__kbd">{text}</kbd>
										{/each}
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{:else}
					<p class="shortcut-cheatsheet__empty">No keyboard shortcuts registered.</p>
				{/each}
			</div>

			{#if footer}
				<div class="shortcut-cheatsheet__footer">{@render footer()}</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.shortcut-cheatsheet {
		position: fixed;
		inset: 0;
		z-index: var(--shortcut-cheatsheet-z-index, 1150);
		display: flex;
		align-items: center;
		justify-content: center;
		font:
			14px/1.4 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
	}

	.shortcut-cheatsheet__backdrop {
		position: absolute;
		inset: 0;
		background: var(--shortcut-cheatsheet-backdrop, rgba(0, 0, 0, 0.5));
		animation: shortcut-cheatsheet-fade 150ms ease-out;
	}

	.shortcut-cheatsheet__panel {
		position: relative;
		display: flex;
		flex-direction: column;
		width: min(var(--shortcut-cheatsheet-width, 48rem), calc(100vw - 2rem));
		max-height: 80vh;
		padding: 24px;
		background: var(--shortcut-cheatsheet-bg, #ffffff);
		color: var(--shortcut-cheatsheet-fg, #111111);
		border: 1px solid var(--shortcut-cheatsheet-border, rgba(0, 0, 0, 0.12));
		border-radius: var(--shortcut-cheatsheet-radius, 12px);
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
		outline: none;
		animation: shortcut-cheatsheet-in 200ms ease-out;
	}

	@keyframes shortcut-cheatsheet-fade {
		from {
			opacity: 0;
		}
	}

	@keyframes shortcut-cheatsheet-in {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shortcut-cheatsheet__backdrop,
		.shortcut-cheatsheet__panel {
			animation: none;
		}
	}

	.shortcut-cheatsheet__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
	}

	.shortcut-cheatsheet__title {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
	}

	.shortcut-cheatsheet__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: var(--shortcut-cheatsheet-item-hover-bg, rgba(0, 0, 0, 0.06));
		color: inherit;
		cursor: pointer;
	}

	.shortcut-cheatsheet__close svg {
		width: 20px;
		height: 20px;
	}

	.shortcut-cheatsheet__close:focus-visible {
		outline: 2px solid var(--shortcut-cheatsheet-accent, #16a34a);
		outline-offset: 2px;
	}

	.shortcut-cheatsheet__body {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 24px 32px;
		min-height: 0;
		overflow-y: auto;
	}

	.shortcut-cheatsheet__section-label {
		margin: 0 0 12px;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--shortcut-cheatsheet-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.shortcut-cheatsheet__list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.shortcut-cheatsheet__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.shortcut-cheatsheet__keys {
		display: inline-flex;
		flex: 0 0 auto;
		gap: 4px;
	}

	.shortcut-cheatsheet__kbd {
		padding: 1px 6px;
		border: 1px solid var(--shortcut-cheatsheet-kbd-border, rgba(0, 0, 0, 0.15));
		border-radius: 4px;
		background: var(--shortcut-cheatsheet-kbd-bg, rgba(0, 0, 0, 0.04));
		color: var(--shortcut-cheatsheet-kbd-fg, inherit);
		font:
			12px/1.4 ui-monospace,
			SFMono-Regular,
			Menlo,
			Consolas,
			monospace;
	}

	.shortcut-cheatsheet__empty {
		margin: 0;
		padding: 32px 0;
		text-align: center;
		color: var(--shortcut-cheatsheet-muted-fg, rgba(0, 0, 0, 0.6));
	}

	.shortcut-cheatsheet__footer {
		display: flex;
		justify-content: center;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid var(--shortcut-cheatsheet-border, rgba(0, 0, 0, 0.12));
		font-size: 13px;
		color: var(--shortcut-cheatsheet-muted-fg, rgba(0, 0, 0, 0.6));
	}
</style>
