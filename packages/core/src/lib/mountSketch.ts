import { fesDisableRequested } from './utils/disableFES.js';

export interface SketchHost {
	setup?: (...args: unknown[]) => unknown;
	remove(): void;
}

export type SketchCtor<P extends SketchHost> = new (sketch: (p: P) => void, node: HTMLElement) => P;

function majorVersion(Ctor: unknown): number {
	return Number.parseInt(String((Ctor as { VERSION?: string }).VERSION ?? '1'), 10);
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

/** Constructs a p5 sketch; `onReady` runs once its `setup()` finished, on p5 1.x and 2.x alike. */
export function mountSketch<P extends SketchHost>(
	Ctor: SketchCtor<P>,
	sketch: (p: P) => void,
	node: HTMLElement,
	onCreated: (p: P) => void,
	onReady?: (p: P) => void
): () => void {
	if (fesDisableRequested()) {
		(Ctor as { disableFriendlyErrors?: boolean }).disableFriendlyErrors = true;
	}

	let constructed = false;
	let destroyed = false;
	let wrapped = false;
	let readyPending = false;

	const ready = (p: P) => {
		if (destroyed) return;
		if (!constructed) readyPending = true;
		else onReady?.(p);
	};

	const instance = new Ctor((p) => {
		sketch(p);
		let userSetup = p.setup;
		if (typeof userSetup !== 'function') {
			// p5 1 checks `typeof setup === 'undefined'` elsewhere; p5 2 makes its canvas before setup.
			if (majorVersion(Ctor) < 2) return;
			userSetup = () => {};
		}
		wrapped = true;
		p.setup = function (this: unknown, ...args: unknown[]) {
			const result = userSetup.apply(this, args);
			if (!isThenable(result)) {
				ready(p);
				return result;
			}
			const done = Promise.resolve(result);
			done.then(
				() => ready(p),
				() => {}
			);
			return done;
		};
	}, node);

	constructed = true;
	onCreated(instance);
	if (readyPending || !wrapped) ready(instance);

	return () => {
		destroyed = true;
		instance.remove();
	};
}
