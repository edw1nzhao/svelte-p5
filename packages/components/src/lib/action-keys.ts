import type { Action, ActionRegistry } from './action-registry.js';

export interface ActionKeysOptions {
	/** Where the keydown listener goes. Default `document`. */
	target?: EventTarget;
	/** Called after an action runs from a shortcut. */
	onRun?: (action: Action) => void;
	/** When given, an action that throws is reported here and `onRun` is skipped. Without it the error propagates. */
	onError?: (error: unknown, action: Action) => void;
	/** Return true to skip the event. Default `isTypingTarget`. */
	ignore?: (event: KeyboardEvent) => boolean;
}

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isEditable(node: unknown): boolean {
	return node instanceof Element && node.closest(EDITABLE) !== null;
}

/**
 * True when the event comes from, or focus is in, an input, textarea, select
 * or contenteditable element, so typing there does not fire shortcuts.
 */
export function isTypingTarget(event: Event): boolean {
	if (isEditable(event.target)) return true;
	return typeof document !== 'undefined' && isEditable(document.activeElement);
}

/**
 * Runs registry actions from one keydown listener. The matched chord's
 * default is prevented and the event stopped unless the chord sets
 * `preventDefault: false`. Returns a function that removes the listener.
 *
 * @example
 * ```ts
 * const detach = attachActionKeys(registry, { onRun: () => redraw() });
 * ```
 */
export function attachActionKeys(
	registry: ActionRegistry,
	options: ActionKeysOptions = {}
): () => void {
	const target = options.target ?? document;
	const ignore = options.ignore ?? isTypingTarget;
	const listener = (event: Event) => {
		if (!(event instanceof KeyboardEvent) || ignore(event)) return;
		const found = registry.matchChord(event);
		if (!found) return;
		if (found.chord.preventDefault !== false) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (options.onError) {
			try {
				found.action.run();
			} catch (error) {
				options.onError(error, found.action);
				return;
			}
		} else {
			found.action.run();
		}
		options.onRun?.(found.action);
	};
	target.addEventListener('keydown', listener);
	return () => target.removeEventListener('keydown', listener);
}

/**
 * `attachActionKeys` as a Svelte attachment, listening on the element it is attached to.
 *
 * @example
 * ```svelte
 * <div {@attach actionKeys(registry)} tabindex="-1">...</div>
 * ```
 */
export function actionKeys(
	registry: ActionRegistry,
	options: Omit<ActionKeysOptions, 'target'> = {}
): (node: EventTarget) => () => void {
	return (node) => attachActionKeys(registry, { ...options, target: node });
}
