<script lang="ts" module>
	/**
	 * A single entity (speaker, actor, track, class, series, etc.) rendered
	 * as a toggle button in the list. Consumers supply a flat array; optional
	 * `group` buckets entities into labeled sections.
	 */
	export interface Entity {
		/** Stable id. Used in onToggle/onColorChange callbacks. */
		id: string;
		/** Human-readable label shown on the button. */
		label: string;
		/** Color swatch. Any CSS color string. */
		color: string;
		/** Default: true. When false, the entity renders dimmed. */
		visible?: boolean;
		/** Optional group label. Entities with the same `group` are rendered together. */
		group?: string;
	}
</script>

<script lang="ts">
	// Entity visibility/color toggle panel.
	//
	// Canvas apps that render N separately-colored series (speakers,
	// actors, clusters, channels) nearly always grow a panel like this:
	// a row of buttons with a colored swatch and a label, each toggling
	// the corresponding entity's visibility in the viz. Optional color
	// editing. Optional grouping (family, cluster). Optional overflow
	// expander once the list exceeds a threshold.
	//
	// The list binds `entities[].visible` back via callbacks rather than
	// by mutating the prop in place — consumers keep their own authoritative
	// state and this component stays stateless.
	//
	// See the package README for a usage example.

	interface Props {
		/** The list of entities. */
		entities: Entity[];
		/** Called when a visibility toggle is clicked. */
		onToggle?: (id: string, visible: boolean) => void;
		/** When provided, a native color input is shown and clicking the swatch opens it. */
		onColorChange?: (id: string, color: string) => void;
		/**
		 * When provided, each item gets a pencil button (shown on hover) that
		 * enters inline-edit mode. Enter/blur commits via this callback;
		 * Escape cancels. Called with the entity's current id and the new
		 * label — the consumer is responsible for updating its own state.
		 */
		onRename?: (id: string, nextLabel: string) => void;
		/** Max entities to show before collapsing the remainder behind a "+N more" expander. */
		maxVisible?: number;
		/** Optional heading above the list. */
		heading?: string;
		class?: string;
	}

	let {
		entities,
		onToggle,
		onColorChange,
		onRename,
		maxVisible,
		heading,
		class: className = ''
	}: Props = $props();

	let expanded = $state(false);
	let editingId = $state<string | null>(null);
	let editValue = $state('');

	const visibleEntities = $derived(
		expanded || maxVisible === undefined ? entities : entities.slice(0, maxVisible)
	);

	const groupKeys = $derived.by(() => {
		const keys: string[] = [];
		for (const e of visibleEntities) {
			const k = e.group ?? '';
			if (!keys.includes(k)) keys.push(k);
		}
		return keys;
	});

	const hasGroupBoundaries = $derived(groupKeys.some((k) => k !== ''));

	const hiddenCount = $derived(
		maxVisible === undefined || expanded ? 0 : Math.max(0, entities.length - maxVisible)
	);

	function entitiesInGroup(key: string): Entity[] {
		return visibleEntities.filter((e) => (e.group ?? '') === key);
	}

	function isVisible(e: Entity) {
		return e.visible !== false;
	}

	function handleToggle(e: Entity) {
		onToggle?.(e.id, !isVisible(e));
	}

	function handleColorInput(e: Entity, event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onColorChange?.(e.id, target.value);
	}

	function startRename(e: Entity) {
		editingId = e.id;
		editValue = e.label;
	}

	function commitRename() {
		if (editingId === null) return;
		const id = editingId;
		const next = editValue.trim();
		editingId = null;
		editValue = '';
		const entity = entities.find((e) => e.id === id);
		if (!entity) return;
		if (next.length === 0 || next === entity.label) return;
		onRename?.(id, next);
	}

	function cancelRename() {
		editingId = null;
		editValue = '';
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelRename();
		}
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
		node.select();
	}
</script>

<div class="entity-toggle-list {className}" data-has-groups={hasGroupBoundaries}>
	{#if heading}
		<div class="entity-toggle-list__heading">{heading}</div>
	{/if}

	{#each groupKeys as key (key)}
		{#if hasGroupBoundaries && key}
			<div class="entity-toggle-list__group-label">{key}</div>
		{/if}
		<div class="entity-toggle-list__row">
			{#each entitiesInGroup(key) as entity (entity.id)}
				<div class="entity-toggle-list__item" class:is-hidden={!isVisible(entity)}>
					{#if onColorChange}
						<label
							class="entity-toggle-list__swatch-wrap"
							aria-label="Change color for {entity.label}"
						>
							<span class="entity-toggle-list__swatch" style:background-color={entity.color}></span>
							<input
								type="color"
								class="entity-toggle-list__color-input"
								value={entity.color}
								oninput={(e) => handleColorInput(entity, e)}
							/>
						</label>
					{:else}
						<span
							class="entity-toggle-list__swatch"
							style:background-color={entity.color}
							aria-hidden="true"
						></span>
					{/if}
					{#if editingId === entity.id}
						<input
							class="entity-toggle-list__edit-input"
							type="text"
							bind:value={editValue}
							onkeydown={handleEditKeydown}
							onblur={commitRename}
							aria-label="Rename {entity.label}"
							use:focusOnMount
						/>
					{:else}
						<button
							type="button"
							class="entity-toggle-list__label"
							aria-pressed={isVisible(entity)}
							title={isVisible(entity) ? `Hide ${entity.label}` : `Show ${entity.label}`}
							onclick={() => handleToggle(entity)}
						>
							{entity.label}
						</button>
					{/if}
					{#if onRename && editingId !== entity.id}
						<button
							type="button"
							class="entity-toggle-list__rename"
							aria-label="Rename {entity.label}"
							title="Rename"
							onclick={() => startRename(entity)}
						>
							<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
								<path
									d="M14.06 9 15 9.94 5.92 19H5v-.92L14.06 9m3.6-6c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29Zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94z"
									fill="currentColor"
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/each}

	{#if hiddenCount > 0}
		<button
			type="button"
			class="entity-toggle-list__expand"
			onclick={() => (expanded = true)}
			title="Show {hiddenCount} more"
		>
			+{hiddenCount} more
		</button>
	{:else if expanded && maxVisible !== undefined && entities.length > maxVisible}
		<button
			type="button"
			class="entity-toggle-list__expand"
			onclick={() => (expanded = false)}
			title="Collapse"
		>
			show less
		</button>
	{/if}
</div>

<style>
	.entity-toggle-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font:
			13px/1.3 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;

		/* Defaults derive from currentColor so the list inherits the
		 * embedding chrome's theme. Consumers can still override any
		 * of these individually. */
		--entity-swatch-size: 14px;
		--entity-btn-bg: transparent;
		--entity-btn-bg-hover: color-mix(in srgb, currentColor 8%, transparent);
		--entity-btn-border-hover: color-mix(in srgb, currentColor 12%, transparent);
		--entity-btn-fg: currentColor;
		--entity-btn-fg-hidden: color-mix(in srgb, currentColor 45%, transparent);
		--entity-heading-fg: color-mix(in srgb, currentColor 65%, transparent);
		--entity-swatch-border: color-mix(in srgb, currentColor 25%, transparent);
		--entity-swatch-inset: color-mix(in srgb, currentColor 15%, transparent);
		--entity-edit-bg: color-mix(in srgb, currentColor 4%, transparent);
		--entity-edit-border: color-mix(in srgb, currentColor 22%, transparent);
		--entity-rename-hover-bg: color-mix(in srgb, currentColor 8%, transparent);
		--entity-focus-ring: color-mix(in srgb, currentColor 55%, transparent);
	}

	.entity-toggle-list__heading,
	.entity-toggle-list__group-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--entity-heading-fg);
	}

	.entity-toggle-list__row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 8px;
		align-items: center;
	}

	.entity-toggle-list__item {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px 6px 10px;
		min-height: 32px;
		border-radius: 6px;
		background: var(--entity-btn-bg);
		border: 1px solid transparent;
		transition:
			background-color 100ms ease,
			border-color 100ms ease;
	}

	.entity-toggle-list__item:hover {
		background: var(--entity-btn-bg-hover);
		border-color: var(--entity-btn-border-hover);
	}

	.entity-toggle-list__item.is-hidden .entity-toggle-list__label {
		color: var(--entity-btn-fg-hidden);
		text-decoration: line-through;
	}

	.entity-toggle-list__item.is-hidden .entity-toggle-list__swatch {
		opacity: 0.3;
	}

	.entity-toggle-list__swatch {
		display: inline-block;
		width: var(--entity-swatch-size);
		height: var(--entity-swatch-size);
		border-radius: 50%;
		border: 1px solid var(--entity-swatch-border);
		flex: 0 0 auto;
		box-shadow: 0 0 0 1px var(--entity-swatch-inset) inset;
	}

	.entity-toggle-list__swatch-wrap {
		position: relative;
		display: inline-flex;
		cursor: pointer;
	}

	.entity-toggle-list__color-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.entity-toggle-list__label {
		background: none;
		border: none;
		padding: 2px 0;
		margin: 0;
		font: inherit;
		font-weight: 500;
		color: var(--entity-btn-fg);
		cursor: pointer;
		text-align: left;
		line-height: 1.25;
	}

	.entity-toggle-list__label:focus-visible {
		outline: 2px solid var(--entity-focus-ring);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.entity-toggle-list__edit-input {
		background: var(--entity-edit-bg);
		border: 1px solid var(--entity-edit-border);
		border-radius: 4px;
		padding: 3px 6px;
		margin: 0;
		font: inherit;
		font-weight: 500;
		color: var(--entity-btn-fg);
		min-width: 90px;
		max-width: 200px;
		width: auto;
	}

	.entity-toggle-list__edit-input:focus {
		outline: 2px solid var(--entity-focus-ring);
		outline-offset: 1px;
	}

	.entity-toggle-list__rename {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		border-radius: 4px;
		color: var(--entity-btn-fg-hidden);
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 100ms ease,
			color 100ms ease,
			background-color 100ms ease;
	}

	.entity-toggle-list__item:hover .entity-toggle-list__rename,
	.entity-toggle-list__rename:focus-visible {
		opacity: 1;
	}

	.entity-toggle-list__rename:hover {
		color: var(--entity-btn-fg);
		background: var(--entity-rename-hover-bg);
	}

	.entity-toggle-list__rename:focus-visible {
		outline: 2px solid var(--entity-focus-ring);
		outline-offset: 1px;
	}

	.entity-toggle-list__expand {
		align-self: flex-start;
		background: none;
		border: none;
		padding: 0;
		color: var(--entity-heading-fg);
		font: inherit;
		font-size: 11px;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
