import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountSketch, type SketchCtor, type SketchHost } from './mountSketch.js';
import { disableFES } from './utils/disableFES.js';

type Host = SketchHost;
type Sketch = (p: Host) => void;

let log: string[];
const node = {} as HTMLElement;

// p5 1.x: setup runs synchronously inside the constructor, its return value ignored.
class FakeP5v1 implements Host {
	static VERSION = '1.11.0';
	static disableFriendlyErrors = false;
	setup?: () => unknown;
	constructor(sketch: Sketch) {
		log.push(`ctor:fes=${FakeP5v1.disableFriendlyErrors}`);
		sketch(this);
		if (typeof this.setup === 'function') this.setup();
		log.push('ctor:end');
	}
	remove() {
		log.push('remove');
	}
}

// p5 2.x: the constructor starts an un-awaited async start that awaits presetup, then setup.
class FakeP5v2 implements Host {
	static VERSION = '2.3.4';
	static disableFriendlyErrors = false;
	setup?: () => unknown;
	started: Promise<void>;
	constructor(sketch: Sketch) {
		log.push(`ctor:fes=${FakeP5v2.disableFriendlyErrors}`);
		sketch(this);
		this.started = this.start();
		log.push('ctor:end');
	}
	async start() {
		await new Promise((r) => setTimeout(r, 0));
		log.push('presetup');
		if (typeof this.setup === 'function') await this.setup();
		log.push('setupDone');
	}
	remove() {
		log.push('remove');
	}
}

const flush = () => new Promise((r) => setTimeout(r, 10));

function mount(Ctor: SketchCtor<Host>, sketch: Sketch) {
	const onReady = vi.fn((p: Host) => log.push(`ready:${p instanceof Ctor}`));
	const destroy = mountSketch(Ctor, sketch, node, () => log.push('created'), onReady);
	return { onReady, destroy };
}

const syncSetup: Sketch = (p) => {
	p.setup = () => log.push('setup');
};

const asyncSetup: Sketch = (p) => {
	p.setup = async () => {
		log.push('setup:start');
		await new Promise((r) => setTimeout(r, 0));
		log.push('setup:end');
	};
};

beforeEach(() => {
	log = [];
	FakeP5v1.disableFriendlyErrors = false;
	FakeP5v2.disableFriendlyErrors = false;
	delete (globalThis as { IS_MINIFIED?: boolean }).IS_MINIFIED;
});

describe('mountSketch on p5 1 semantics', () => {
	it('fires onReady after setup and after the instance is bound', () => {
		mount(FakeP5v1, syncSetup);
		expect(log).toEqual(['ctor:fes=false', 'setup', 'ctor:end', 'created', 'ready:true']);
	});

	it('fires onReady only after an async setup resolves', async () => {
		const { onReady } = mount(FakeP5v1, asyncSetup);
		expect(onReady).not.toHaveBeenCalled();
		await flush();
		expect(log.slice(-2)).toEqual(['setup:end', 'ready:true']);
	});

	it('fires onReady straight after construction when the sketch has no setup', () => {
		const { onReady } = mount(FakeP5v1, () => {});
		expect(onReady).toHaveBeenCalledOnce();
		expect(log).toEqual(['ctor:fes=false', 'ctor:end', 'created', 'ready:true']);
	});

	it('does not install a setup when the sketch has none', () => {
		let seen: Host | undefined;
		mountSketch(
			FakeP5v1,
			() => {},
			node,
			(p) => (seen = p)
		);
		expect(seen?.setup).toBeUndefined();
	});

	it('does not fire onReady when setup throws', () => {
		const onReady = vi.fn();
		const boom: Sketch = (p) => {
			p.setup = () => {
				throw new Error('boom');
			};
		};
		expect(() => mountSketch(FakeP5v1, boom, node, () => {}, onReady)).toThrow('boom');
		expect(onReady).not.toHaveBeenCalled();
	});

	it('does not fire onReady when destroyed before an async setup resolves', async () => {
		const { onReady, destroy } = mount(FakeP5v1, asyncSetup);
		destroy();
		await flush();
		expect(onReady).not.toHaveBeenCalled();
		expect(log).toContain('remove');
	});
});

describe('mountSketch on p5 2 semantics', () => {
	it('fires onReady after setup, not after construction', async () => {
		const { onReady } = mount(FakeP5v2, syncSetup);
		expect(onReady).not.toHaveBeenCalled();
		await flush();
		expect(log).toEqual([
			'ctor:fes=false',
			'ctor:end',
			'created',
			'presetup',
			'setup',
			'ready:true',
			'setupDone'
		]);
	});

	it('fires onReady only after an async setup resolves', async () => {
		mount(FakeP5v2, asyncSetup);
		await flush();
		expect(log.slice(-4)).toEqual(['setup:start', 'setup:end', 'ready:true', 'setupDone']);
	});

	it('still lets p5 await the user setup', async () => {
		let p5Resumed = false;
		const sketch: Sketch = (p) => {
			p.setup = async () => {
				await new Promise((r) => setTimeout(r, 0));
				expect(p5Resumed).toBe(false);
			};
		};
		let inst: FakeP5v2 | undefined;
		mountSketch(FakeP5v2, sketch, node, (p) => (inst = p as FakeP5v2));
		await inst!.started;
		p5Resumed = true;
		expect(log.at(-1)).toBe('setupDone');
	});

	it('fires onReady after p5 has started when the sketch has no setup', async () => {
		const { onReady } = mount(FakeP5v2, () => {});
		expect(onReady).not.toHaveBeenCalled();
		await flush();
		expect(onReady).toHaveBeenCalledOnce();
		expect(log).toEqual([
			'ctor:fes=false',
			'ctor:end',
			'created',
			'presetup',
			'ready:true',
			'setupDone'
		]);
	});

	it('does not fire onReady when an async setup rejects', async () => {
		const onReady = vi.fn();
		const boom: Sketch = (p) => {
			p.setup = async () => {
				throw new Error('boom');
			};
		};
		let inst: FakeP5v2 | undefined;
		mountSketch(FakeP5v2, boom, node, (p) => (inst = p as FakeP5v2), onReady);
		await expect(inst!.started).rejects.toThrow('boom');
		expect(onReady).not.toHaveBeenCalled();
	});

	it('does not fire onReady when destroyed before setup runs', async () => {
		const { onReady, destroy } = mount(FakeP5v2, syncSetup);
		destroy();
		await flush();
		expect(onReady).not.toHaveBeenCalled();
		expect(log).toContain('remove');
	});
});

describe('mountSketch and disableFES', () => {
	it.each([
		['p5 1', FakeP5v1],
		['p5 2', FakeP5v2]
	])('sets disableFriendlyErrors before constructing on %s', (_, Ctor) => {
		disableFES();
		mount(Ctor, syncSetup);
		expect(Ctor.disableFriendlyErrors).toBe(true);
		expect(log[0]).toBe('ctor:fes=true');
	});

	it('leaves disableFriendlyErrors alone when disableFES was not called', () => {
		mount(FakeP5v2, syncSetup);
		expect(FakeP5v2.disableFriendlyErrors).toBe(false);
	});
});
