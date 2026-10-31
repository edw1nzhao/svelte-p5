/** A function for p5 2's `p5.registerAddon`; `fn` is `p5.prototype`. */
export type P5Addon = (p5: any, fn: any, lifecycles: P5AddonLifecycles) => void;

/** Hooks an add-on may set. `this` is the sketch instance, so use `function`, not arrows. */
export interface P5AddonLifecycles {
	presetup?: (this: any) => unknown;
	postsetup?: (this: any) => unknown;
	predraw?: (this: any) => unknown;
	postdraw?: (this: any) => unknown;
	remove?: (this: any) => unknown;
}

interface AddonHost {
	VERSION?: string;
	registerAddon?: (addon: P5Addon) => void;
}

const registered = new WeakMap<object, WeakSet<P5Addon>>();

/** Registers each add-on once per p5 constructor; p5 cannot unregister them. */
export function registerAddons(Ctor: unknown, addons: readonly P5Addon[] | undefined): void {
	if (!addons?.length) return;
	const host = Ctor as AddonHost;
	if (typeof host.registerAddon !== 'function') {
		throw new Error(
			`svelte-p5: the addons prop needs p5.registerAddon, which p5 ${host.VERSION ?? '1.x'} ` +
				'does not have (it arrived in p5 2.0). On p5 1.x, import the add-on for its side ' +
				'effects instead; see https://svelte-p5.dev/docs/addons.'
		);
	}
	let seen = registered.get(host);
	if (!seen) registered.set(host, (seen = new WeakSet()));
	for (const addon of addons) {
		if (seen.has(addon)) continue;
		host.registerAddon(addon);
		seen.add(addon);
	}
}
