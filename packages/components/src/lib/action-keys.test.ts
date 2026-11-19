import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachActionKeys } from './action-keys.js';
import { createActionRegistry, type Action } from './action-registry.js';

function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
	target.dispatchEvent(event);
	return event;
}

function setup(actions: Action[]) {
	const registry = createActionRegistry(actions, { mac: false });
	const onRun = vi.fn();
	const detach = attachActionKeys(registry, { onRun });
	return { registry, onRun, detach };
}

let cleanup: (() => void)[] = [];
afterEach(() => {
	for (const fn of cleanup) fn();
	cleanup = [];
	document.body.replaceChildren();
});

describe('attachActionKeys', () => {
	it('runs the matching action, then onRun, and prevents the default', () => {
		const order: string[] = [];
		const run = vi.fn(() => order.push('run'));
		const { onRun, detach } = setup([{ id: 'trails', label: 'Trails', keys: { key: 'm' }, run }]);
		onRun.mockImplementation(() => order.push('onRun'));
		cleanup.push(detach);

		const event = press(document.body, { key: 'm' });
		expect(order).toEqual(['run', 'onRun']);
		expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ id: 'trails' }));
		expect(event.defaultPrevented).toBe(true);
	});

	it('stops propagation of a handled key', () => {
		const { detach } = setup([{ id: 'a', label: 'A', keys: { key: 'a' }, run: () => {} }]);
		cleanup.push(detach);
		const outer = vi.fn();
		window.addEventListener('keydown', outer);
		cleanup.push(() => window.removeEventListener('keydown', outer));
		press(document.body, { key: 'a' });
		press(document.body, { key: 'b' });
		expect(outer).toHaveBeenCalledTimes(1);
	});

	it('leaves the default alone when the chord opts out', () => {
		const run = vi.fn();
		const { detach } = setup([
			{ id: 'a', label: 'A', keys: { key: 'a', preventDefault: false }, run }
		]);
		cleanup.push(detach);
		const event = press(document.body, { key: 'a' });
		expect(run).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(false);
	});

	it.each([
		['input', () => document.createElement('input')],
		['textarea', () => document.createElement('textarea')],
		['select', () => document.createElement('select')],
		[
			'contenteditable',
			() => {
				const div = document.createElement('div');
				div.setAttribute('contenteditable', 'true');
				return div;
			}
		]
	])('ignores keys typed into a %s', (_, make) => {
		const run = vi.fn();
		const { onRun, detach } = setup([{ id: 'a', label: 'A', keys: { key: 'a' }, run }]);
		cleanup.push(detach);
		const field = make();
		document.body.append(field);
		field.focus();
		const event = press(field, { key: 'a' });
		expect(run).not.toHaveBeenCalled();
		expect(onRun).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it('accepts a custom ignore predicate', () => {
		const run = vi.fn();
		const registry = createActionRegistry([{ id: 'a', label: 'A', keys: { key: 'a' }, run }]);
		const detach = attachActionKeys(registry, { ignore: (e) => e.repeat });
		cleanup.push(detach);
		const input = document.createElement('input');
		document.body.append(input);
		input.focus();
		press(input, { key: 'a', repeat: true });
		press(input, { key: 'a' });
		expect(run).toHaveBeenCalledTimes(1);
	});

	it('listens on a given target only', () => {
		const run = vi.fn();
		const registry = createActionRegistry([{ id: 'a', label: 'A', keys: { key: 'a' }, run }]);
		const host = document.createElement('div');
		const other = document.createElement('div');
		document.body.append(host, other);
		cleanup.push(attachActionKeys(registry, { target: host }));
		press(other, { key: 'a' });
		press(host, { key: 'a' });
		expect(run).toHaveBeenCalledTimes(1);
	});

	it('lets a throwing action propagate when there is no onError', () => {
		const failure = new Error('boom');
		const registry = createActionRegistry([
			{
				id: 'a',
				label: 'A',
				keys: { key: 'a' },
				run: () => {
					throw failure;
				}
			}
		]);
		const listeners: EventListener[] = [];
		const target = new EventTarget();
		target.addEventListener = (
			_type: string,
			listener: EventListenerOrEventListenerObject | null
		) => {
			if (typeof listener === 'function') listeners.push(listener);
		};
		const onRun = vi.fn();
		cleanup.push(attachActionKeys(registry, { target, onRun }));
		expect(listeners).toHaveLength(1);
		const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
		expect(() => listeners[0]?.(event)).toThrow(failure);
		expect(onRun).not.toHaveBeenCalled();
	});

	it('reports a throwing action to onError and skips onRun', () => {
		const failure = new Error('boom');
		const registry = createActionRegistry([
			{
				id: 'a',
				label: 'A',
				keys: { key: 'a' },
				run: () => {
					throw failure;
				}
			}
		]);
		const onRun = vi.fn();
		const onError = vi.fn();
		cleanup.push(attachActionKeys(registry, { onRun, onError }));
		const event = press(document.body, { key: 'a' });
		expect(onError).toHaveBeenCalledWith(failure, registry.get('a'));
		expect(onRun).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);
	});

	it('stops listening after detach', () => {
		const run = vi.fn();
		const { detach } = setup([{ id: 'a', label: 'A', keys: { key: 'a' }, run }]);
		detach();
		press(document.body, { key: 'a' });
		expect(run).not.toHaveBeenCalled();
	});
});
