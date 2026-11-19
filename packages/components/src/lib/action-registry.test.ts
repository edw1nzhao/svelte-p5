import { describe, it, expect } from 'vitest';
import {
	createActionRegistry,
	formatActionKeys,
	formatKeys,
	type Action,
	type KeyInput
} from './action-registry.js';

const noop = () => {};

function key(k: string, mods: Partial<Omit<KeyInput, 'key'>> = {}): KeyInput {
	return { key: k, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods };
}

function action(id: string, extra: Partial<Action> = {}): Action {
	return { id, label: id, run: noop, ...extra };
}

describe('createActionRegistry', () => {
	it('lists actions in order and looks them up by id', () => {
		const registry = createActionRegistry([action('a'), action('b', { hidden: true })]);
		expect(registry.list().map((a) => a.id)).toEqual(['a', 'b']);
		expect(registry.get('b')?.hidden).toBe(true);
		expect(registry.get('missing')).toBeUndefined();
	});

	it('throws on a duplicate id', () => {
		expect(() => createActionRegistry([action('a'), action('a')])).toThrow(
			/Duplicate action id "a"/
		);
	});

	describe('match', () => {
		const registry = (mac: boolean) =>
			createActionRegistry(
				[
					action('movement', { keys: { key: 'm' } }),
					action('reverse', { keys: { key: 'R', shift: true } }),
					action('palette', { keys: { key: 'k', mod: true } }),
					action('speed-up', { keys: [{ key: '=' }, { key: '+' }] })
				],
				{ mac }
			);

		it('matches a plain key', () => {
			expect(registry(false).match(key('m'))?.id).toBe('movement');
		});

		it('requires modifiers to match exactly', () => {
			const r = registry(false);
			expect(r.match(key('m', { ctrlKey: true }))).toBeUndefined();
			expect(r.match(key('m', { shiftKey: true }))).toBeUndefined();
			expect(r.match(key('R'))).toBeUndefined();
			expect(r.match(key('R', { shiftKey: true }))?.id).toBe('reverse');
			expect(r.match(key('k', { ctrlKey: true, shiftKey: true }))).toBeUndefined();
		});

		it('resolves mod to Ctrl off macOS', () => {
			const r = registry(false);
			expect(r.match(key('k', { ctrlKey: true }))?.id).toBe('palette');
			expect(r.match(key('k', { metaKey: true }))).toBeUndefined();
		});

		it('resolves mod to Cmd on macOS', () => {
			const r = registry(true);
			expect(r.match(key('k', { metaKey: true }))?.id).toBe('palette');
			expect(r.match(key('k', { ctrlKey: true }))).toBeUndefined();
		});

		it('matches every chord of a multi-key action and reports which one', () => {
			const r = registry(false);
			expect(r.match(key('='))?.id).toBe('speed-up');
			expect(r.matchChord(key('+'))).toEqual({
				action: r.get('speed-up'),
				chord: { key: '+' }
			});
		});

		it('still matches hidden actions', () => {
			const r = createActionRegistry(
				[action('undo', { hidden: true, keys: { key: 'z', mod: true } })],
				{
					mac: false
				}
			);
			expect(r.match(key('z', { ctrlKey: true }))?.id).toBe('undo');
		});
	});

	describe('shift matching', () => {
		const r = createActionRegistry(
			[
				action('speed-up', { keys: [{ key: '=' }, { key: '+' }] }),
				action('help', { keys: { key: '?', shift: true } }),
				action('slash', { keys: { key: '/', shift: false } }),
				action('redo', { keys: { key: 'z', mod: true, shift: true } }),
				action('undo', { keys: { key: 'z', mod: true } }),
				action('zoom', { keys: { key: 'z' } }),
				action('back', { keys: { key: 'ArrowLeft' } })
			],
			{ mac: false }
		);

		it('fires a symbol chord with or without Shift held', () => {
			expect(r.match(key('+', { shiftKey: true }))?.id).toBe('speed-up');
			expect(r.match(key('+'))?.id).toBe('speed-up');
			expect(r.match(key('=', { shiftKey: true }))?.id).toBe('speed-up');
		});

		it('honours an explicit shift on a symbol chord', () => {
			expect(r.match(key('?', { shiftKey: true }))?.id).toBe('help');
			expect(r.match(key('?'))).toBeUndefined();
			expect(r.match(key('/'))?.id).toBe('slash');
			expect(r.match(key('/', { shiftKey: true }))).toBeUndefined();
		});

		it('matches mod+shift+z arriving as "Z"', () => {
			expect(r.match(key('Z', { ctrlKey: true, shiftKey: true }))?.id).toBe('redo');
			expect(r.match(key('z', { ctrlKey: true }))?.id).toBe('undo');
		});

		it('does not fire a plain letter while Shift is held', () => {
			expect(r.match(key('z'))?.id).toBe('zoom');
			expect(r.match(key('Z', { shiftKey: true }))).toBeUndefined();
		});

		it('keeps exact Shift matching for named keys', () => {
			expect(r.match(key('ArrowLeft'))?.id).toBe('back');
			expect(r.match(key('ArrowLeft', { shiftKey: true }))).toBeUndefined();
		});

		it('still requires Ctrl, Alt and Meta to match on symbols', () => {
			expect(r.match(key('+', { ctrlKey: true }))).toBeUndefined();
			expect(r.match(key('+', { altKey: true }))).toBeUndefined();
		});
	});

	describe('conflicts', () => {
		it('is empty when every chord is unique', () => {
			const r = createActionRegistry([
				action('a', { keys: { key: 'a' } }),
				action('b', { keys: { key: 'b' } })
			]);
			expect(r.conflicts).toEqual([]);
		});

		it('reports each pair of actions bound to the same chord', () => {
			const a = action('a', { keys: { key: 'x' } });
			const b = action('b', { keys: [{ key: 'y' }, { key: 'x' }] });
			const c = action('c', { keys: { key: 'x', shift: true } });
			const r = createActionRegistry([a, b, c], { mac: false });
			expect(r.conflicts).toEqual([{ keys: 'X', actions: [a, b] }]);
		});

		it('resolves mod per platform before comparing', () => {
			const a = action('a', { keys: { key: 'z', mod: true } });
			const b = action('b', { keys: { key: 'z', ctrl: true } });
			expect(createActionRegistry([a, b], { mac: false }).conflicts).toHaveLength(1);
			expect(createActionRegistry([a, b], { mac: true }).conflicts).toHaveLength(0);
		});

		it('does not report = and + as a conflict', () => {
			const r = createActionRegistry([
				action('a', { keys: { key: '=' } }),
				action('b', { keys: { key: '+' } })
			]);
			expect(r.conflicts).toEqual([]);
		});

		it('uses the shift rules: an unshifted symbol overlaps a shifted one, letters fold case', () => {
			const q = action('q', { keys: { key: '?' } });
			const qs = action('qs', { keys: { key: '?', shift: true } });
			const lower = action('lower', { keys: { key: 'r' } });
			const upper = action('upper', { keys: { key: 'R' } });
			const shifted = action('shifted', { keys: { key: 'R', shift: true } });
			const r = createActionRegistry([q, qs, lower, upper, shifted], { mac: false });
			expect(r.conflicts).toEqual([
				{ keys: '?', actions: [q, qs] },
				{ keys: 'R', actions: [lower, upper] }
			]);
		});

		it('ignores an action repeating its own chord', () => {
			const r = createActionRegistry([action('a', { keys: [{ key: 'x' }, { key: 'x' }] })]);
			expect(r.conflicts).toEqual([]);
		});
	});

	describe('groups', () => {
		const actions = [
			action('play', { group: 'playback' }),
			action('undo', { group: 'history' }),
			action('trails', { group: 'filter' }),
			action('loose'),
			action('example', { group: 'examples' }),
			action('clear', { group: 'clear' }),
			action('rate', { group: 'playback' })
		];
		const registry = createActionRegistry(actions, {
			groupLabels: { playback: 'Playback', filter: 'Filter' }
		});

		it('groups by first appearance with labels, ungrouped under an empty id', () => {
			expect(registry.groups().map((g) => [g.id, g.label, g.actions.map((a) => a.id)])).toEqual([
				['playback', 'Playback', ['play', 'rate']],
				['history', 'history', ['undo']],
				['filter', 'Filter', ['trails']],
				['', '', ['loose']],
				['examples', 'examples', ['example']],
				['clear', 'clear', ['clear']]
			]);
		});

		it('merges groups into ordered sections and drops what no section names', () => {
			const sections = registry.groups({
				sections: [
					{ id: 'navigation', label: 'Navigation', groups: ['history', 'examples'] },
					{ id: 'playback' },
					{ id: 'data', label: 'Data', groups: ['filter', 'clear'] },
					{ id: 'empty', label: 'Empty' }
				]
			});
			expect(sections.map((g) => [g.id, g.label, g.actions.map((a) => a.id)])).toEqual([
				['navigation', 'Navigation', ['undo', 'example']],
				['playback', 'Playback', ['play', 'rate']],
				['data', 'Data', ['trails', 'clear']]
			]);
		});

		it('groups a given subset in the given order', () => {
			const subset = [registry.get('rate'), registry.get('trails'), registry.get('play')].flatMap(
				(a) => (a ? [a] : [])
			);
			expect(
				registry.groups({ actions: subset }).map((g) => [g.id, g.actions.map((a) => a.id)])
			).toEqual([
				['playback', ['rate', 'play']],
				['filter', ['trails']]
			]);
		});
	});

	it('shortcuts() returns actions with keys, hidden ones included', () => {
		const r = createActionRegistry([
			action('a', { keys: { key: 'a' } }),
			action('b'),
			action('c', { keys: [], hidden: true }),
			action('d', { keys: { key: 'd' }, hidden: true })
		]);
		expect(r.shortcuts().map((a) => a.id)).toEqual(['a', 'd']);
	});
});

describe('formatKeys', () => {
	const pc = { mac: false };
	const mac = { mac: true };

	it('matches the IGS display for non-mod chords off macOS', () => {
		expect(formatKeys({ key: 'm' }, pc)).toBe('M');
		expect(formatKeys({ key: ' ' }, pc)).toBe('Space');
		expect(formatKeys({ key: 'ArrowLeft' }, pc)).toBe('←');
		expect(formatKeys({ key: 'ArrowRight' }, pc)).toBe('→');
		expect(formatKeys({ key: 'ArrowUp' }, pc)).toBe('↑');
		expect(formatKeys({ key: 'ArrowDown' }, pc)).toBe('↓');
		expect(formatKeys({ key: 'Escape' }, pc)).toBe('Esc');
		expect(formatKeys({ key: 'Home' }, pc)).toBe('Home');
		expect(formatKeys({ key: 'R', shift: true }, pc)).toBe('Shift+R');
		expect(formatKeys({ key: '?', shift: true }, pc)).toBe('Shift+?');
		expect(formatKeys({ key: 'x', ctrl: true, alt: true, shift: true }, pc)).toBe(
			'Ctrl+Alt+Shift+X'
		);
	});

	it('shows mod as Ctrl off macOS and ⌘ on macOS', () => {
		expect(formatKeys({ key: 'k', mod: true }, pc)).toBe('Ctrl+K');
		expect(formatKeys({ key: 'k', mod: true }, mac)).toBe('⌘K');
		expect(formatKeys({ key: 'S', mod: true, shift: true }, pc)).toBe('Ctrl+Shift+S');
		expect(formatKeys({ key: 'S', mod: true, shift: true }, mac)).toBe('⇧⌘S');
	});

	it('uses macOS modifier glyphs in Apple order', () => {
		expect(formatKeys({ key: 'a', ctrl: true, alt: true, shift: true, meta: true }, mac)).toBe(
			'⌃⌥⇧⌘A'
		);
		expect(formatKeys({ key: ' ' }, mac)).toBe('Space');
	});

	it('gives named keys short names on both platforms', () => {
		for (const opts of [pc, mac]) {
			expect(formatKeys({ key: 'Escape' }, opts)).toBe('Esc');
			expect(formatKeys({ key: 'Enter' }, opts)).toBe('Enter');
			expect(formatKeys({ key: 'Backspace' }, opts)).toBe('Backspace');
			expect(formatKeys({ key: 'Delete' }, opts)).toBe('Del');
			expect(formatKeys({ key: 'Tab' }, opts)).toBe('Tab');
			expect(formatKeys({ key: 'PageDown' }, opts)).toBe('PgDn');
		}
		expect(formatKeys({ key: 'Escape', shift: true }, mac)).toBe('⇧Esc');
	});

	it('shows Shift on a symbol only when the chord sets it', () => {
		expect(formatKeys({ key: '+' }, pc)).toBe('+');
		expect(formatKeys({ key: '?', shift: true }, pc)).toBe('Shift+?');
	});

	it('formatActionKeys lists each distinct chord once', () => {
		expect(formatActionKeys({ keys: [{ key: '=' }, { key: '+' }] }, pc)).toEqual(['=', '+']);
		expect(
			formatActionKeys(
				{
					keys: [
						{ key: 'z', mod: true },
						{ key: 'z', ctrl: true }
					]
				},
				pc
			)
		).toEqual(['Ctrl+Z']);
		expect(formatActionKeys({}, pc)).toEqual([]);
	});
});
