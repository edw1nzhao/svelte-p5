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
		maxVisible,
		heading,
		class: className = ''
	}: Props = $props();

	let expanded = $state(false);

	const visibleEntities = $derived(
		expanded || maxVisible === undefined ? entities : entities.slice(0, maxVisible)
	);

	const hiddenCount = $derived(
		maxVisible === undefined || expanded ? 0 : Math.max(0, entities.length - maxVisible)
	);

	// Preserve insertion order within groups. Plain-object bucket rather than
	// Map to keep the derived value trivially reactive — the lint rule against
	// mutable Map instances inside runes is a useful guard even though this
	// one is throwaway.
	const grouped = $derived.by(() => {
		const buckets: Record<string, Entity[]> = {};
		const order: string[] = [];
		for (const e of visibleEntities) {
			const key = e.group ?? '';
			let bucket = buckets[key];
			if (!bucket) {
				bucket = [];
				buckets[key] = bucket;
				order.push(key);
			}
			bucket.push(e);
		}
		return order.map((key) => ({ key, entities: buckets[key] ?? [] }));
	});

	const hasGroups = $derived(grouped.some((g) => g.key !== ''));

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
</script>

<div class="entity-toggle-list {className}" data-has-groups={hasGroups}>
	{#if heading}
		<div class="entity-toggle-list__heading">{heading}</div>
	{/if}

	{#each grouped as group (group.key)}
		{#if hasGroups && group.key}
			<div class="entity-toggle-list__group-label">{group.key}</div>
		{/if}
		<div class="entity-toggle-list__row">
			{#each group.entities as entity (entity.id)}
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
					<button
						type="button"
						class="entity-toggle-list__label"
						aria-pressed={isVisible(entity)}
						title={isVisible(entity) ? `Hide ${entity.label}` : `Show ${entity.label}`}
						onclick={() => handleToggle(entity)}
					>
						{entity.label}
					</button>
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
			12px/1.3 system-ui,
			-apple-system,
			Segoe UI,
			sans-serif;

		--entity-swatch-size: 12px;
		--entity-btn-bg: transparent;
		--entity-btn-bg-hover: rgba(0, 0, 0, 0.05);
		--entity-btn-fg: #111;
		--entity-btn-fg-hidden: #9ca3af;
		--entity-heading-fg: #6b7280;
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
		gap: 4px 8px;
		align-items: center;
	}

	.entity-toggle-list__item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 6px 2px 4px;
		border-radius: 4px;
		background: var(--entity-btn-bg);
	}

	.entity-toggle-list__item:hover {
		background: var(--entity-btn-bg-hover);
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
		border: 1px solid rgba(0, 0, 0, 0.15);
		flex: 0 0 auto;
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
		padding: 0;
		margin: 0;
		font: inherit;
		color: var(--entity-btn-fg);
		cursor: pointer;
		text-align: left;
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
