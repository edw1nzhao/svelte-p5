import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRecentActions } from './recent-actions.js';

const KEY = 'test-recent';

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	localStorage.clear();
});

function tick() {
	vi.advanceTimersByTime(1000);
}

describe('createRecentActions', () => {
	it('is empty when nothing is stored', () => {
		expect(createRecentActions(KEY).list()).toEqual([]);
	});

	it('records runs most recent first and counts repeats', () => {
		const recents = createRecentActions(KEY);
		recents.add('a');
		tick();
		recents.add('b');
		tick();
		recents.add('a');
		expect(recents.list()).toEqual([
			{ id: 'a', lastUsed: '2026-01-01T00:00:02.000Z', useCount: 2 },
			{ id: 'b', lastUsed: '2026-01-01T00:00:01.000Z', useCount: 1 }
		]);
	});

	it('keeps at most five entries by default, dropping the oldest', () => {
		const recents = createRecentActions(KEY);
		for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
			recents.add(id);
			tick();
		}
		expect(recents.list().map((e) => e.id)).toEqual(['f', 'e', 'd', 'c', 'b']);
	});

	it('honours a custom max', () => {
		const recents = createRecentActions(KEY, { max: 2 });
		for (const id of ['a', 'b', 'c']) {
			recents.add(id);
			tick();
		}
		expect(recents.list().map((e) => e.id)).toEqual(['c', 'b']);
	});

	it('persists under its key only', () => {
		createRecentActions(KEY).add('a');
		expect(
			createRecentActions(KEY)
				.list()
				.map((e) => e.id)
		).toEqual(['a']);
		expect(createRecentActions('other').list()).toEqual([]);
	});

	it('ignores corrupt stored data', () => {
		localStorage.setItem(KEY, '{not json');
		expect(createRecentActions(KEY).list()).toEqual([]);
		localStorage.setItem(
			KEY,
			JSON.stringify([{ id: 1 }, { id: 'ok', lastUsed: 'x', useCount: 1 }])
		);
		expect(
			createRecentActions(KEY)
				.list()
				.map((e) => e.id)
		).toEqual(['ok']);
	});

	it('tolerates missing localStorage', () => {
		vi.stubGlobal('localStorage', undefined);
		const recents = createRecentActions(KEY);
		expect(() => recents.add('a')).not.toThrow();
		expect(recents.list()).toEqual([]);
	});

	it('tolerates localStorage that throws', () => {
		const boom = () => {
			throw new Error('denied');
		};
		vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
		const recents = createRecentActions(KEY);
		expect(() => recents.add('a')).not.toThrow();
		expect(recents.list()).toEqual([]);
	});
});
