<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Slide-in drawer panel. Renders adjacent to an `ActivityBar` in a
	 * `CanvasFrame`'s `leftRail` slot (or anywhere the caller places it).
	 * The panel itself is purely presentational — the caller owns its
	 * open/closed state via the bindable `open` prop.
	 *
	 * Layout: the panel's width is bindable and mirrors pointer-drag
	 * resizes on its right edge. Width is clamped to `[minWidth, maxWidth]`.
	 * A slide transform handles the open/close animation (no external
	 * transition dep).
	 *
	 * Close affordances:
	 * - Clicking the × in the default header
	 * - Pressing Escape while the panel is open
	 * - The caller setting `open = false` programmatically
	 *
	 * Public class-name contract (stable across versions):
	 *   .side-panel
	 *   .side-panel--open
	 *   .side-panel__header
	 *   .side-panel__title
	 *   .side-panel__close
	 *   .side-panel__body
	 *   .side-panel__resize-handle
	 *
	 * @example
	 * ```svelte
	 * <SidePanel bind:open title="Filters" bind:width>
	 *   <MyFilterForm />
	 * </SidePanel>
	 * ```
	 */
	interface Props {
		/** Whether the panel is visible. Bindable. */
		open: boolean;
		/** Title rendered in the default header. */
		title?: string;
		/** Panel width in px. Bindable; updated live during resize drags. */
		width?: number;
		/** Minimum width in px. Default: 220. */
		minWidth?: number;
		/** Maximum width in px. Default: 480. */
		maxWidth?: number;
		/** When false, the right-edge resize handle is not rendered. Default: true. */
		resizable?: boolean;
		/** Fired when the panel wants to close (close button, Escape). */
		onClose?: () => void;
		/** Optional replacement for the default header (title + close). */
		header?: Snippet;
		/** Panel body content. */
		children?: Snippet;
		class?: string;
	}

	let {
		open = $bindable(false),
		title,
		width = $bindable(280),
		minWidth = 220,
		maxWidth = 480,
		resizable = true,
		onClose,
		header,
		children,
		class: className = ''
	}: Props = $props();

	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartWidth = 0;

	function handleClose() {
		onClose?.();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.stopPropagation();
			handleClose();
		}
	}

	function beginResize(event: PointerEvent) {
		if (!resizable) return;
		event.preventDefault();
		isDragging = true;
		dragStartX = event.clientX;
		dragStartWidth = width;
		document.addEventListener('pointermove', handleResizeMove);
		document.addEventListener('pointerup', endResize);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function handleResizeMove(event: PointerEvent) {
		if (!isDragging) return;
		const delta = event.clientX - dragStartX;
		const next = Math.min(maxWidth, Math.max(minWidth, dragStartWidth + delta));
		width = next;
	}

	function endResize() {
		isDragging = false;
		document.removeEventListener('pointermove', handleResizeMove);
		document.removeEventListener('pointerup', endResize);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<aside
		class="side-panel {open ? 'side-panel--open' : ''} {className}"
		style:width="{width}px"
		aria-hidden={!open}
	>
		{#if header}
			{@render header()}
		{:else}
			<div class="side-panel__header">
				<h2 class="side-panel__title">{title ?? ''}</h2>
				<button
					type="button"
					class="side-panel__close"
					onclick={handleClose}
					aria-label="Close panel"
					title="Close"
				>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<path
							d="M18.3 5.71 12 12.01l-6.29-6.3-1.42 1.41 6.3 6.3-6.3 6.29 1.42 1.41 6.29-6.29 6.29 6.29 1.41-1.41-6.29-6.29 6.29-6.3z"
							fill="currentColor"
						/>
					</svg>
				</button>
			</div>
		{/if}

		<div class="side-panel__body">
			{#if children}{@render children()}{/if}
		</div>

		{#if resizable}
			<div
				class="side-panel__resize-handle"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize panel"
				onpointerdown={beginResize}
			></div>
		{/if}
	</aside>
{/if}

<style>
	.side-panel {
		position: relative;
		display: flex;
		flex-direction: column;
		flex: 0 0 auto;
		height: 100%;
		background: var(--side-panel-bg, #fafafa);
		border-right: 1px solid var(--side-panel-border, rgba(0, 0, 0, 0.1));
		box-shadow: var(--side-panel-shadow, 2px 0 6px rgba(0, 0, 0, 0.04));
		animation: side-panel-slide-in 160ms ease-out;
		overflow: hidden;
		min-height: 0;
	}

	@keyframes side-panel-slide-in {
		from {
			transform: translateX(-8px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.side-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid var(--side-panel-border, rgba(0, 0, 0, 0.08));
		flex: 0 0 auto;
	}

	.side-panel__title {
		margin: 0;
		font:
			13px/1.3 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--side-panel-title-fg, #555);
	}

	.side-panel__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--side-panel-close-fg, #666);
		border-radius: 4px;
		cursor: pointer;
	}

	.side-panel__close:hover {
		background: rgba(0, 0, 0, 0.06);
		color: #111;
	}

	.side-panel__close:focus-visible {
		outline: 2px solid rgba(59, 130, 246, 0.55);
		outline-offset: 1px;
	}

	.side-panel__body {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
	}

	.side-panel__resize-handle {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 6px;
		cursor: col-resize;
		background: transparent;
		transition: background-color 120ms ease;
	}

	.side-panel__resize-handle:hover,
	.side-panel__resize-handle:active {
		background: rgba(59, 130, 246, 0.2);
	}
</style>
