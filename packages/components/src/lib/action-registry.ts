import type { Snippet } from 'svelte';

/**
 * One key combination. Ctrl, Alt and Meta must match exactly. Letters match
 * either case and Shift must match exactly, so `{ key: 'z', mod: true, shift: true }`
 * fires on Cmd/Ctrl+Shift+Z. A single non-letter character such as `+` or `?`
 * ignores Shift unless the chord sets `shift`, because keyboard layouts differ
 * on which characters need it. Named keys (`'ArrowLeft'`, `'Escape'`, `' '`)
 * match Shift exactly.
 */
export interface KeyChord {
	/** `KeyboardEvent.key`: `'k'`, `' '`, `'ArrowLeft'`, `'?'`. Letters match either case. */
	key: string;
	/** Cmd on macOS, Ctrl elsewhere. */
	mod?: boolean;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
	/** Set to `false` to let the browser handle the key too. Default `true`. */
	preventDefault?: boolean;
}

/**
 * A command the user can run from a shortcut, the command palette, or both.
 */
export interface Action {
	/** Unique within a registry. */
	id: string;
	/** Shown in the palette and the cheatsheet. */
	label: string;
	/** Second line in the palette; also searched. */
	description?: string;
	/** Extra search terms. */
	keywords?: string[];
	/** Group id, used to group the palette and cheatsheet. */
	group?: string;
	/** One chord, or several chords that all run the action. */
	keys?: KeyChord | KeyChord[];
	run: () => void;
	/** When present, the action is a toggle and this reports its current state. */
	checked?: () => boolean;
	/** Leading icon: text such as an emoji, or a snippet. */
	icon?: string | Snippet;
	/** Left out of the command palette; its shortcut still works. */
	hidden?: boolean;
}

/**
 * Chooses which groups appear, in which order, and under which heading.
 * Several action groups can merge into one section.
 */
export interface ActionSection {
	id: string;
	/** Heading. Default: `groupLabels[id]`, then `id`. */
	label?: string;
	/** Action groups collected into this section, in this order. Default `[id]`. */
	groups?: readonly string[];
}

/** A heading and the actions under it. `id` and `label` are `''` for ungrouped actions. */
export interface ActionGroup {
	id: string;
	label: string;
	actions: Action[];
}

/** Two actions that one keypress could fire, on the registry's platform. */
export interface ActionConflict {
	/** The shared chord, formatted for the registry's platform. */
	keys: string;
	actions: readonly [Action, Action];
}

/** An action together with the chord that matched. */
export interface ActionMatch {
	action: Action;
	chord: KeyChord;
}

/** The parts of a `KeyboardEvent` that matching reads. */
export type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>;

export interface ActionRegistryOptions {
	/** Treat `mod` as Cmd. Default: detected from `navigator`. */
	mac?: boolean;
	/** Headings for group ids. A group without one is headed by its id. */
	groupLabels?: Readonly<Record<string, string>>;
}

export interface GroupOptions {
	/** Sections to show, in order. Default: every group, in first-appearance order. */
	sections?: readonly ActionSection[];
	/** Actions to group, in display order. Default: `list()`. */
	actions?: readonly Action[];
}

export interface ActionRegistry {
	/** Whether `mod` resolves to Cmd. */
	readonly mac: boolean;
	/** Pairs of actions that share a chord, found when the registry was created. */
	readonly conflicts: readonly ActionConflict[];
	/** Every action, hidden ones included, in registration order. */
	list(): readonly Action[];
	get(id: string): Action | undefined;
	/** The first action, in registration order, with a chord matching the event. */
	match(event: KeyInput): Action | undefined;
	/** Like `match`, and also returns the chord that matched. */
	matchChord(event: KeyInput): ActionMatch | undefined;
	/** The heading for a group id. */
	groupLabel(group: string): string;
	/** Actions grouped for display. With `sections`, actions outside every section are left out. */
	groups(options?: GroupOptions): ActionGroup[];
	/** Actions that have at least one chord, hidden ones included. */
	shortcuts(): Action[];
}

interface ResolvedChord {
	key: string;
	ctrl: boolean;
	alt: boolean;
	shift: boolean | null;
	meta: boolean;
}

/** True on macOS and iOS, read from `navigator`. False where there is no `navigator`. */
export function isMacPlatform(): boolean {
	if (typeof navigator === 'undefined') return false;
	return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** An action's chords as an array. */
export function chordsOf(action: Pick<Action, 'keys'>): KeyChord[] {
	if (!action.keys) return [];
	return Array.isArray(action.keys) ? action.keys : [action.keys];
}

function isLetter(key: string): boolean {
	return key.length === 1 && key.toLowerCase() !== key.toUpperCase();
}

function isSymbol(key: string): boolean {
	return key.length === 1 && key !== ' ' && !isLetter(key);
}

function resolve(chord: KeyChord, mac: boolean): ResolvedChord {
	return {
		key: isLetter(chord.key) ? chord.key.toLowerCase() : chord.key,
		ctrl: !!chord.ctrl || (!!chord.mod && !mac),
		alt: !!chord.alt,
		shift: isSymbol(chord.key) && chord.shift === undefined ? null : !!chord.shift,
		meta: !!chord.meta || (!!chord.mod && mac)
	};
}

function sameChord(a: ResolvedChord, b: ResolvedChord): boolean {
	return (
		a.key === b.key &&
		a.ctrl === b.ctrl &&
		a.alt === b.alt &&
		(a.shift === null || b.shift === null || a.shift === b.shift) &&
		a.meta === b.meta
	);
}

/** Whether a keyboard event fires this chord, by the rules on `KeyChord`. */
export function chordMatches(chord: KeyChord, event: KeyInput, options: { mac: boolean }): boolean {
	return sameChord(resolve(chord, options.mac), {
		key: isLetter(event.key) ? event.key.toLowerCase() : event.key,
		ctrl: event.ctrlKey,
		alt: event.altKey,
		shift: event.shiftKey,
		meta: event.metaKey
	});
}

const KEY_NAMES: Readonly<Record<string, string>> = {
	' ': 'Space',
	ArrowLeft: '←',
	ArrowRight: '→',
	ArrowUp: '↑',
	ArrowDown: '↓',
	Escape: 'Esc',
	Delete: 'Del',
	PageUp: 'PgUp',
	PageDown: 'PgDn'
};

function keyName(key: string): string {
	return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/**
 * Formats a chord for display: `⇧⌘S` on macOS, `Ctrl+Shift+S` elsewhere.
 * Space reads `Space`, arrows are glyphs, `Escape` is `Esc`, `Delete` is `Del`,
 * single characters are upper-cased, other named keys read as written.
 */
export function formatKeys(chord: KeyChord, options: { mac: boolean }): string {
	const c = resolve(chord, options.mac);
	const key = keyName(c.key);
	if (options.mac) {
		return `${c.ctrl ? '⌃' : ''}${c.alt ? '⌥' : ''}${c.shift === true ? '⇧' : ''}${c.meta ? '⌘' : ''}${key}`;
	}
	const parts: string[] = [];
	if (c.ctrl) parts.push('Ctrl');
	if (c.alt) parts.push('Alt');
	if (c.shift === true) parts.push('Shift');
	if (c.meta) parts.push('Meta');
	parts.push(key);
	return parts.join('+');
}

/** Each distinct display string for an action's chords, in declaration order. */
export function formatActionKeys(
	action: Pick<Action, 'keys'>,
	options: { mac: boolean }
): string[] {
	return [...new Set(chordsOf(action).map((chord) => formatKeys(chord, options)))];
}

/**
 * Creates an immutable registry over a list of actions.
 *
 * @throws if two actions share an id.
 *
 * @example
 * ```ts
 * const registry = createActionRegistry(
 *   [{ id: 'palette', label: 'Open palette', keys: { key: 'k', mod: true }, run: openPalette }],
 *   { groupLabels: { view: 'View' } }
 * );
 * ```
 */
export function createActionRegistry(
	actions: readonly Action[],
	options: ActionRegistryOptions = {}
): ActionRegistry {
	const mac = options.mac ?? isMacPlatform();
	const labels = options.groupLabels ?? {};
	const all: readonly Action[] = [...actions];
	const byId = new Map<string, Action>();
	for (const action of all) {
		if (byId.has(action.id)) throw new Error(`Duplicate action id "${action.id}"`);
		byId.set(action.id, action);
	}

	const bound = all.flatMap((action) =>
		chordsOf(action).map((chord) => ({ action, chord, resolved: resolve(chord, mac) }))
	);

	const conflicts: ActionConflict[] = [];
	const seen = new Set<string>();
	for (let i = 0; i < bound.length; i++) {
		for (let j = i + 1; j < bound.length; j++) {
			const a = bound[i];
			const b = bound[j];
			if (!a || !b || a.action === b.action || !sameChord(a.resolved, b.resolved)) continue;
			const pair = `${a.action.id}\u0000${b.action.id}\u0000${formatKeys(a.chord, { mac })}`;
			if (seen.has(pair)) continue;
			seen.add(pair);
			conflicts.push({ keys: formatKeys(a.chord, { mac }), actions: [a.action, b.action] });
		}
	}

	function groupLabel(group: string): string {
		return labels[group] ?? group;
	}

	function matchChord(event: KeyInput): ActionMatch | undefined {
		for (const entry of bound) {
			if (chordMatches(entry.chord, event, { mac })) {
				return { action: entry.action, chord: entry.chord };
			}
		}
		return undefined;
	}

	function groups(groupOptions: GroupOptions = {}): ActionGroup[] {
		const source = groupOptions.actions ?? all;
		const byGroup = new Map<string, Action[]>();
		for (const action of source) {
			const id = action.group ?? '';
			const bucket = byGroup.get(id);
			if (bucket) bucket.push(action);
			else byGroup.set(id, [action]);
		}
		if (!groupOptions.sections) {
			return [...byGroup].map(([id, list]) => ({
				id,
				label: id === '' ? '' : groupLabel(id),
				actions: list
			}));
		}
		return groupOptions.sections
			.map((section) => ({
				id: section.id,
				label: section.label ?? groupLabel(section.id),
				actions: (section.groups ?? [section.id]).flatMap((group) => byGroup.get(group) ?? [])
			}))
			.filter((group) => group.actions.length > 0);
	}

	return {
		mac,
		conflicts,
		list: () => all,
		get: (id) => byId.get(id),
		match: (event) => matchChord(event)?.action,
		matchChord,
		groupLabel,
		groups,
		shortcuts: () => all.filter((action) => chordsOf(action).length > 0)
	};
}
