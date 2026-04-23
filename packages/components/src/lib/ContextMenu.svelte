<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/**
	 * One entry rendered as a row in the context menu.
	 */
	export interface ContextMenuItem {
		/** Stable id passed back via `onSelect`. */
		id: string;
		/** Human-readable label. */
		label: string;
		/** Optional leading icon. */
		icon?: Snippet;
		/** When true the item is rendered but not activatable. */
		disabled?: boolean;
		/** When true the item is rendered with a destructive accent. */
		danger?: boolean;
	}
</script>

<script lang="ts">
	/**
	 * Lightweight floating action menu, anchored to a viewport point.
	 *
	 * Use for Figma-style selection-contextual chrome: click a thing on a
	 * canvas, get actions near the cursor. Positioning is viewport-fixed
	 * (`position: fixed`) so the menu does not scroll with the page. The
	 * menu auto-flips horizontally and/or vertically when it would overflow
	 * the viewport — mirroring `HoverTooltip`'s edge-aware layout.
	 *
	 * Close affordances:
	 * - Pointerdown outside the menu
	 * - Escape keypress
	 * - Window blur, scroll, or resize
	 * - Selecting an enabled item
	 * - Caller sets `open = false`
	 *
	 * Keyboard:
	 * - Up / Down arrow moves focus between enabled items (wraps)
	 * - Home / End jump to first / last enabled item
	 * - Enter or Space activates the focused item
	 * - Escape closes
	 *
	 * Public class-name contract (stable across versions):
	 *   .context-menu
	 *   .context-menu__list
	 *   .context-menu__item
	 *   .context-menu__item--disabled
	 *   .context-menu__item--danger
	 *   .context-menu__item-icon
	 *   .context-menu__item-label
	 *
	 * @example
	 * ```svelte
	 * <ContextMenu
	 *   bind:open
	 *   anchor={{ x: evt.clientX, y: evt.clientY }}
	 *   items={[
	 *     { id: 'seek', label: 'Seek video here' },
	 *     { id: 'filter', label: 'Filter to speaker' }
	 *   ]}
	 *   onSelect={(id) => doAction(id)}
	 *   onClose={() => (open = false)}
	 * />
	 * ```
	 */
	interface Props {
		/** Whether the menu is visible. Bindable. */
		open: boolean;
		/** Anchor point in client (page) coordinates. Menu top-left aligns here until flipped. */
		anchor: { x: number; y: number } | null;
		/** Menu entries. */
		items: ContextMenuItem[];
		/** Fired with the activated item id. */
		onSelect?: (id: string) => void;
		/** Fired whenever the menu should close (Escape, outside click, blur, etc.). */
		onClose?: () => void;
		class?: string;
	}

	let {
		open = $bindable(false),
		anchor,
		items,
		onSelect,
		onClose,
		class: className = ''
	}: Props = $props();

	let menuEl: HTMLDivElement | null = $state(null);
	let measuredWidth = $state(0);
	let measuredHeight = $state(0);
	let focusedIndex = $state(-1);
	let previouslyFocused: HTMLElement | null = null;

	// Respect prefers-reduced-motion. Detected once per mount; re-reading is
	// cheap but unnecessary — animation duration is the only thing gated on
	// this so the CSS handles the reduced case via a @media rule anyway.
	const prefersReducedMotion =
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Measure after mount so auto-flip has real dimensions to work with. The
	// ResizeObserver also catches the case where items / labels change while
	// the menu is open.
	$effect(() => {
		if (!menuEl) return;
		const el = menuEl;
		const ro = new ResizeObserver(() => {
			const r = el.getBoundingClientRect();
			measuredWidth = r.width;
			measuredHeight = r.height;
		});
		ro.observe(el);
		const initial = el.getBoundingClientRect();
		measuredWidth = initial.width;
		measuredHeight = initial.height;
		return () => ro.disconnect();
	});

	// Focus + dismiss wiring. Only attaches while open, and captures the
	// previously-focused element so we can restore focus on close.
	$effect(() => {
		if (!open) return;
		previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
		const firstEnabled = items.findIndex((it) => !it.disabled);
		focusedIndex = firstEnabled;

		// Attach after a microtask so our own opening pointerdown doesn't
		// immediately get interpreted as an outside click.
		let attached = false;
		const attach = () => {
			if (attached) return;
			attached = true;
			document.addEventListener('pointerdown', handleDocumentPointerDown, true);
			window.addEventListener('blur', handleWindowBlur);
			window.addEventListener('resize', handleWindowResize);
			window.addEventListener('scroll', handleWindowScroll, true);
		};
		const handle = requestAnimationFrame(attach);

		return () => {
			cancelAnimationFrame(handle);
			if (attached) {
				document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
				window.removeEventListener('blur', handleWindowBlur);
				window.removeEventListener('resize', handleWindowResize);
				window.removeEventListener('scroll', handleWindowScroll, true);
			}
			// Restore focus to whatever owned it before the menu opened.
			if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
				previouslyFocused.focus({ preventScroll: true });
			}
			previouslyFocused = null;
		};
	});

	// When the focused index changes, actually move DOM focus to that item so
	// keyboard users see a visible focus ring and activate on Enter.
	$effect(() => {
		if (!open) return;
		if (focusedIndex < 0 || !menuEl) return;
		const buttons = menuEl.querySelectorAll<HTMLButtonElement>('[data-context-menu-item]');
		const target = buttons[focusedIndex];
		if (target && document.activeElement !== target) {
			target.focus({ preventScroll: true });
		}
	});

	const placement = $derived.by<{ left: number; top: number } | null>(() => {
		if (!anchor) return null;
		if (typeof window === 'undefined') return null;

		const vpW = window.innerWidth;
		const vpH = window.innerHeight;
		const pad = 4;
		const { x, y } = anchor;

		// Horizontal: prefer the right of the anchor; flip to the left if it
		// would overflow. Clamp inside the viewport either way.
		let left = x;
		if (measuredWidth > 0 && left + measuredWidth + pad > vpW) {
			left = x - measuredWidth;
		}
		left = Math.max(pad, Math.min(vpW - measuredWidth - pad, left));

		// Vertical: prefer below the anchor; flip above if it would overflow.
		let top = y;
		if (measuredHeight > 0 && top + measuredHeight + pad > vpH) {
			top = y - measuredHeight;
		}
		top = Math.max(pad, Math.min(vpH - measuredHeight - pad, top));

		return { left, top };
	});

	function closeMenu() {
		onClose?.();
	}

	function handleDocumentPointerDown(event: PointerEvent) {
		if (!menuEl) return;
		const target = event.target as Node | null;
		if (target && menuEl.contains(target)) return;
		closeMenu();
	}

	function handleWindowBlur() {
		closeMenu();
	}

	function handleWindowResize() {
		closeMenu();
	}

	function handleWindowScroll() {
		closeMenu();
	}

	function nextEnabled(from: number, dir: 1 | -1): number {
		const n = items.length;
		if (n === 0) return -1;
		let idx = from;
		for (let i = 0; i < n; i++) {
			idx = (idx + dir + n) % n;
			if (!items[idx].disabled) return idx;
		}
		return -1;
	}

	function firstEnabled(): number {
		const idx = items.findIndex((it) => !it.disabled);
		return idx;
	}

	function lastEnabled(): number {
		for (let i = items.length - 1; i >= 0; i--) {
			if (!items[i].disabled) return i;
		}
		return -1;
	}

	function handleMenuKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape': {
				event.preventDefault();
				event.stopPropagation();
				closeMenu();
				return;
			}
			case 'ArrowDown': {
				event.preventDefault();
				focusedIndex = nextEnabled(focusedIndex, 1);
				return;
			}
			case 'ArrowUp': {
				event.preventDefault();
				focusedIndex = nextEnabled(focusedIndex, -1);
				return;
			}
			case 'Home': {
				event.preventDefault();
				focusedIndex = firstEnabled();
				return;
			}
			case 'End': {
				event.preventDefault();
				focusedIndex = lastEnabled();
				return;
			}
			case 'Enter':
			case ' ': {
				if (focusedIndex < 0) return;
				const it = items[focusedIndex];
				if (!it || it.disabled) return;
				event.preventDefault();
				activate(it.id);
				return;
			}
		}
	}

	function activate(id: string) {
		onSelect?.(id);
		closeMenu();
	}

	function handleItemClick(item: ContextMenuItem) {
		if (item.disabled) return;
		activate(item.id);
	}
</script>

{#if open && anchor}
	<div
		bind:this={menuEl}
		class="context-menu {className}"
		class:context-menu--reduced-motion={prefersReducedMotion}
		role="menu"
		tabindex="-1"
		style:left="{placement?.left ?? anchor.x}px"
		style:top="{placement?.top ?? anchor.y}px"
		style:visibility={placement ? 'visible' : 'hidden'}
		onkeydown={handleMenuKeydown}
	>
		<ul class="context-menu__list">
			{#each items as item, i (item.id)}
				<li>
					<button
						type="button"
						data-context-menu-item
						class="context-menu__item"
						class:context-menu__item--disabled={item.disabled}
						class:context-menu__item--danger={item.danger}
						role="menuitem"
						aria-disabled={item.disabled ? 'true' : undefined}
						tabindex={focusedIndex === i ? 0 : -1}
						onclick={() => handleItemClick(item)}
						onmouseenter={() => {
							if (!item.disabled) focusedIndex = i;
						}}
					>
						{#if item.icon}
							<span class="context-menu__item-icon" aria-hidden="true">
								{@render item.icon()}
							</span>
						{/if}
						<span class="context-menu__item-label">{item.label}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 1100;
		min-width: 180px;
		max-width: 320px;
		padding: 4px 0;
		background: var(--context-menu-bg, #ffffff);
		color: var(--context-menu-fg, #111);
		border: 1px solid var(--context-menu-border, rgba(0, 0, 0, 0.1));
		border-radius: 8px;
		box-shadow:
			0 8px 20px rgba(0, 0, 0, 0.14),
			0 2px 4px rgba(0, 0, 0, 0.06);
		font:
			13px/1.3 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;
		user-select: none;
		animation: context-menu-in 100ms ease-out;
		transform-origin: top left;
	}

	.context-menu--reduced-motion {
		animation: none;
	}

	@keyframes context-menu-in {
		from {
			transform: scale(0.96);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.context-menu {
			animation: none;
		}
	}

	.context-menu__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.context-menu__item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: transparent;
		color: inherit;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}

	.context-menu__item:hover:not(.context-menu__item--disabled),
	.context-menu__item:focus-visible:not(.context-menu__item--disabled) {
		background: var(--context-menu-item-hover-bg, rgba(59, 130, 246, 0.12));
		color: var(--context-menu-item-hover-fg, inherit);
		outline: none;
	}

	.context-menu__item--disabled {
		color: var(--context-menu-item-disabled-fg, rgba(0, 0, 0, 0.38));
		cursor: default;
	}

	.context-menu__item--danger {
		color: var(--context-menu-item-danger-fg, #dc2626);
	}

	.context-menu__item--danger:hover:not(.context-menu__item--disabled),
	.context-menu__item--danger:focus-visible:not(.context-menu__item--disabled) {
		background: var(--context-menu-item-danger-hover-bg, rgba(220, 38, 38, 0.1));
		color: var(--context-menu-item-danger-fg, #dc2626);
	}

	.context-menu__item-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 16px;
		height: 16px;
	}

	.context-menu__item-label {
		flex: 1 1 auto;
		min-width: 0;
	}
</style>
