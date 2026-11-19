/** One remembered action. */
export interface RecentActionEntry {
	id: string;
	/** ISO timestamp of the last run. */
	lastUsed: string;
	useCount: number;
}

export interface RecentActions {
	/** Up to `max` entries, most recently used first. Empty when storage is unavailable. */
	list(): RecentActionEntry[];
	/** Records a run: moves the action to the front and bumps its count. */
	add(id: string): void;
}

export interface RecentActionsOptions {
	/** How many entries to keep. Default 5. */
	max?: number;
}

function isEntry(value: unknown): value is RecentActionEntry {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'lastUsed' in value &&
		typeof value.lastUsed === 'string' &&
		'useCount' in value &&
		typeof value.useCount === 'number'
	);
}

function storage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/**
 * Recently run actions, kept in `localStorage` under `storageKey`. Missing,
 * blocked, full or corrupt storage never throws: reads return `[]` and
 * writes are dropped.
 */
export function createRecentActions(
	storageKey: string,
	options: RecentActionsOptions = {}
): RecentActions {
	const max = options.max ?? 5;

	function list(): RecentActionEntry[] {
		try {
			const raw = storage()?.getItem(storageKey);
			if (!raw) return [];
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed
				.filter(isEntry)
				.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
				.slice(0, max);
		} catch {
			return [];
		}
	}

	function add(id: string): void {
		try {
			const store = storage();
			if (!store) return;
			const recent = list();
			const lastUsed = new Date().toISOString();
			const index = recent.findIndex((entry) => entry.id === id);
			const existing = recent[index];
			if (existing) recent[index] = { id, lastUsed, useCount: existing.useCount + 1 };
			else recent.unshift({ id, lastUsed, useCount: 1 });
			store.setItem(storageKey, JSON.stringify(recent.slice(0, max)));
		} catch {
			return;
		}
	}

	return { list, add };
}
