import { describe, it, expect, expectTypeOf } from 'vitest';
import { createPanelRegistry } from './registry.js';
import type { VizPanel } from './types.js';

const makeStubPanel = (type: string): VizPanel<unknown, Record<string, unknown>> => ({
	type,
	defaultConfig: {},
	render() {
		return { hover: null };
	}
});

describe('createPanelRegistry', () => {
	it('starts empty', () => {
		const r = createPanelRegistry();
		expect(r.list()).toEqual([]);
		expect(r.has('anything')).toBe(false);
		expect(r.get('anything')).toBeUndefined();
	});

	it('registers and retrieves a panel by type', () => {
		const r = createPanelRegistry();
		const panel = makeStubPanel('word-cloud');
		r.register(panel);

		expect(r.has('word-cloud')).toBe(true);
		expect(r.get('word-cloud')).toBe(panel);
		expect(r.list()).toHaveLength(1);
	});

	it('throws on duplicate type — duplicate registration is always a bug for the studio', () => {
		const r = createPanelRegistry();
		r.register(makeStubPanel('timeline-track'));
		expect(() => r.register(makeStubPanel('timeline-track'))).toThrow(
			/timeline-track.*already registered/
		);
	});

	it('preserves insertion order in list()', () => {
		const r = createPanelRegistry();
		r.register(makeStubPanel('a'));
		r.register(makeStubPanel('b'));
		r.register(makeStubPanel('c'));
		expect(r.list().map((p) => p.type)).toEqual(['a', 'b', 'c']);
	});

	it('unregister removes a panel and reports truthy/falsy correctly', () => {
		const r = createPanelRegistry();
		r.register(makeStubPanel('one'));

		expect(r.unregister('one')).toBe(true);
		expect(r.has('one')).toBe(false);
		expect(r.unregister('one')).toBe(false);
	});

	it('list() returns a snapshot, not a live view', () => {
		const r = createPanelRegistry();
		r.register(makeStubPanel('first'));
		const snapshot = r.list();
		r.register(makeStubPanel('second'));

		expect(snapshot).toHaveLength(1);
		expect(r.list()).toHaveLength(2);
	});

	it('preserves TData / TConfig generics at the register call site', () => {
		interface MyData {
			points: number[];
		}
		interface MyConfig {
			color: string;
		}
		const panel: VizPanel<MyData, MyConfig> = {
			type: 'dot',
			defaultConfig: { color: 'red' },
			render(ctx, data, config) {
				expectTypeOf(data).toEqualTypeOf<MyData>();
				expectTypeOf(config).toEqualTypeOf<MyConfig>();
				return { hover: null };
			}
		};
		const r = createPanelRegistry();
		r.register(panel);
		expect(r.get('dot')?.type).toBe('dot');
	});
});
