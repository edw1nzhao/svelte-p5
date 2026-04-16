/**
 * Shared focus manager for DraggableWindow instances.
 *
 * Each DraggableWindow registers once and receives a reactive `z` value
 * plus a `focus()` method. Calling `focus()` increments a shared counter
 * and reassigns that window's z-index, bringing it to the front relative
 * to every other registered window.
 *
 * Counter is a single `$state` number; z-index values are small integers
 * starting at 100. At 1 click/ms it would take ~285,000 years to
 * overflow `Number.MAX_SAFE_INTEGER`, so no normalization step is needed.
 */

let counter = $state(100);

export interface WindowHandle {
	readonly z: number;
	focus(): void;
}

export function registerWindow(): WindowHandle {
	let myZ = $state(++counter);
	return {
		get z() {
			return myZ;
		},
		focus() {
			// Only reassign if we're not already the top window - avoids a
			// no-op reactive write when the already-focused window gets clicked.
			if (myZ !== counter) myZ = ++counter;
		}
	};
}
