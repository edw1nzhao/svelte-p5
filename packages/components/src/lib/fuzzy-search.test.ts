import { describe, it, expect } from 'vitest';
import { fuzzyMatch, getHighlightSegments, searchActions } from './fuzzy-search.js';
import type { Action } from './action-registry.js';

const noop = () => {};
const action = (id: string, extra: Partial<Action> = {}): Action => ({
	id,
	label: id,
	run: noop,
	...extra
});

describe('fuzzyMatch', () => {
	it('returns null unless every query character matches in order', () => {
		expect(fuzzyMatch('xyz', 'Movement')).toBeNull();
		expect(fuzzyMatch('tm', 'Movement')).toBeNull();
		expect(fuzzyMatch('', 'Movement')).toBeNull();
		expect(fuzzyMatch('m', '')).toBeNull();
	});

	it('scores a start-of-string match with the length penalty', () => {
		expect(fuzzyMatch('m', 'Movement')).toEqual({ score: 16 - 0.8, indices: [0] });
	});

	it('adds word-start, consecutive and exact-case bonuses', () => {
		expect(fuzzyMatch('mt', 'Toggle Movement Trails')).toEqual({
			score: 11 + 2 - 2.2,
			indices: [7, 14]
		});
		const play = fuzzyMatch('play', 'Play');
		expect(play?.indices).toEqual([0, 1, 2, 3]);
		expect(play?.score).toBeCloseTo(16 + 7 + 12 + 17 - 0.4);
	});

	it('ranks a prefix above a scattered match', () => {
		const prefix = fuzzyMatch('sto', 'Stop points');
		const scattered = fuzzyMatch('sto', 'Toggle Stats Overlay');
		expect(prefix && scattered && prefix.score > scattered.score).toBe(true);
	});
});

describe('searchActions', () => {
	const actions = [
		action('movement', {
			label: 'Toggle Movement Trails',
			description: 'Show or hide movement paths',
			keywords: ['trails', 'paths'],
			group: 'filter'
		}),
		action('stops', { label: 'Toggle Stop Points', keywords: ['pause'], group: 'filter' }),
		action('play', { label: 'Play', group: 'playback' }),
		action('rotate', { label: 'Rotate Floor Plan', description: 'Turn the floor plan' })
	];

	it('returns nothing for a blank query', () => {
		expect(searchActions('   ', actions)).toEqual([]);
	});

	it('excludes actions that do not match anywhere', () => {
		expect(searchActions('zzz', actions)).toEqual([]);
	});

	it('sorts by score, best first', () => {
		const results = searchActions('trails', actions);
		expect(results[0]?.action.id).toBe('movement');
		const scores = results.map((r) => r.match.score);
		expect(scores).toEqual([...scores].sort((a, b) => b - a));
	});

	it('finds an action through a keyword and reports the field', () => {
		const [hit] = searchActions('pause', actions);
		expect(hit?.action.id).toBe('stops');
		expect(hit?.field).toBe('keyword');
	});

	it('keeps the label match when it scores best', () => {
		const [hit] = searchActions('rotate', actions);
		expect(hit?.field).toBe('label');
		expect(hit?.match.indices).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('lets a group match win when it beats half the best score', () => {
		const hit = searchActions('play', actions).find((r) => r.action.id === 'play');
		expect(hit?.field).toBe('group');
		expect(hit?.match.score).toBeCloseTo(17 + 7 + 12 + 17 - 0.8);
	});

	it('lists an action matched only by its group', () => {
		const results = searchActions('filter', actions);
		expect(results.map((r) => r.action.id).sort()).toEqual(['movement', 'stops']);
		expect(results.every((r) => r.field === 'group')).toBe(true);
	});
});

describe('getHighlightSegments', () => {
	it('returns the whole text unhighlighted with no indices', () => {
		expect(getHighlightSegments('Play', [])).toEqual([{ text: 'Play', highlighted: false }]);
	});

	it('merges runs of highlighted and plain characters', () => {
		expect(getHighlightSegments('Toggle Movement', [0, 1, 7, 8])).toEqual([
			{ text: 'To', highlighted: true },
			{ text: 'ggle ', highlighted: false },
			{ text: 'Mo', highlighted: true },
			{ text: 'vement', highlighted: false }
		]);
	});

	it('handles a fully highlighted string', () => {
		expect(getHighlightSegments('ab', [0, 1])).toEqual([{ text: 'ab', highlighted: true }]);
	});
});
