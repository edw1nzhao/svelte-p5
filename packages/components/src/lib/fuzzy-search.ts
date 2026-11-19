import type { Action } from './action-registry.js';

/** A fuzzy match: higher scores rank first; `indices` are the matched characters. */
export interface FuzzyMatch {
	score: number;
	indices: number[];
}

/** Which field of an action produced its best match. */
export type MatchField = 'label' | 'description' | 'keyword' | 'group';

export interface ActionSearchResult {
	action: Action;
	match: FuzzyMatch;
	/** The field `match.indices` refer to. */
	field: MatchField;
}

/** A run of text, highlighted or not. */
export interface HighlightSegment {
	text: string;
	highlighted: boolean;
}

/**
 * Matches the query's characters in order anywhere in the target, ignoring case.
 * Scores +1 per character, +15 at the start, +10 at a word start, a growing bonus
 * for consecutive characters, +1 for matching case, minus 0.1 per target character.
 * Returns null unless every query character matches.
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
	if (!query || !target) return null;

	const queryLower = query.toLowerCase();
	const targetLower = target.toLowerCase();

	let score = 0;
	let queryIndex = 0;
	const indices: number[] = [];
	let consecutiveMatches = 0;
	let lastMatchIndex = -2;

	for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
		if (targetLower[i] !== queryLower[queryIndex]) continue;
		indices.push(i);
		score += 1;
		if (i === 0) score += 15;
		if (i > 0 && /[\s\-_.]/.test(targetLower[i - 1] ?? '')) score += 10;
		if (i === lastMatchIndex + 1) {
			consecutiveMatches++;
			score += 5 * consecutiveMatches;
		} else {
			consecutiveMatches = 0;
		}
		if (target[i] === query[queryIndex]) score += 1;
		lastMatchIndex = i;
		queryIndex++;
	}

	if (queryIndex !== queryLower.length) return null;

	score -= target.length * 0.1;
	return { score, indices };
}

/**
 * Fuzzy-searches actions by label, description, keywords and group id,
 * best score first. A blank query returns nothing.
 */
export function searchActions(query: string, actions: readonly Action[]): ActionSearchResult[] {
	if (!query.trim()) return [];

	const results: ActionSearchResult[] = [];
	for (const action of actions) {
		const candidates: [string, MatchField][] = [[action.label, 'label']];
		if (action.description) candidates.push([action.description, 'description']);
		for (const keyword of action.keywords ?? []) candidates.push([keyword, 'keyword']);

		let best: { match: FuzzyMatch; field: MatchField } | null = null;
		for (const [target, field] of candidates) {
			const match = fuzzyMatch(query, target);
			if (match && (!best || match.score > best.match.score)) best = { match, field };
		}

		if (action.group !== undefined) {
			const groupMatch = fuzzyMatch(query, action.group);
			if (groupMatch && (!best || groupMatch.score > best.match.score * 0.5)) {
				best = { match: groupMatch, field: 'group' };
			}
		}

		if (best) results.push({ action, match: best.match, field: best.field });
	}

	results.sort((a, b) => b.match.score - a.match.score);
	return results;
}

/** Splits text into highlighted and plain runs for the given character indices. */
export function getHighlightSegments(text: string, indices: readonly number[]): HighlightSegment[] {
	if (indices.length === 0) return [{ text, highlighted: false }];

	const marked = new Set(indices);
	const segments: HighlightSegment[] = [];
	let current: HighlightSegment | null = null;

	for (let i = 0; i < text.length; i++) {
		const highlighted = marked.has(i);
		const char = text[i] ?? '';
		if (current && current.highlighted === highlighted) {
			current.text += char;
		} else {
			if (current) segments.push(current);
			current = { text: char, highlighted };
		}
	}
	if (current) segments.push(current);
	return segments;
}
