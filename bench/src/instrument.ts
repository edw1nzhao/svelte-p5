/**
 * Lifecycle + frame-rate instrumentation for the bench.
 *
 * - Counts how many sketch setup() calls have run (= p5 instances created).
 * - Counts remove() calls on tracked instances (= clean teardowns).
 * - Counts every draw() invocation, split into:
 *     - foregroundDraws: the most-recently-tracked instance only
 *     - ghostDraws:      every prior instance (still running because never
 *                        had remove() called on it)
 *
 * The foreground/ghost split is what lets us measure "how many fps does
 * the visible sketch keep when there are N ghost loops behind it" - the
 * most direct user-facing impact of the lifecycle leak.
 */

declare global {
	interface Window {
		__bench: {
			created: number;
			removed: number;
			foregroundDraws: number;
			ghostDraws: number;
			currentId: number;
			alive: () => number;
			reset: () => void;
		};
	}
}

if (typeof window !== 'undefined' && !window.__bench) {
	window.__bench = {
		created: 0,
		removed: 0,
		foregroundDraws: 0,
		ghostDraws: 0,
		currentId: 0,
		alive: () => window.__bench.created - window.__bench.removed,
		reset: () => {
			window.__bench.created = 0;
			window.__bench.removed = 0;
			window.__bench.foregroundDraws = 0;
			window.__bench.ghostDraws = 0;
			// Don't reset currentId - we want previously-tracked instances to
			// stay marked as ghosts even across resets.
		}
	};
}

export function onSetup() {
	if (typeof window !== 'undefined') window.__bench.created += 1;
}

/**
 * Patch a p5 instance so we count remove() calls and draw() invocations.
 * Each call assigns the instance a new generation id; only the latest id
 * counts as foreground. Older instances (still drawing because they
 * weren't removed) increment ghostDraws instead.
 */
export function trackInstance<T extends { remove?: () => void; draw?: () => void }>(p: T): T {
	if (typeof window === 'undefined' || !p) return p;

	const myId = ++window.__bench.currentId;

	if (p.remove) {
		const original = p.remove.bind(p);
		p.remove = () => {
			window.__bench.removed += 1;
			return original();
		};
	}
	if (p.draw) {
		const original = p.draw.bind(p);
		p.draw = () => {
			if (myId === window.__bench.currentId) {
				window.__bench.foregroundDraws += 1;
			} else {
				window.__bench.ghostDraws += 1;
			}
			return original();
		};
	}
	return p;
}
