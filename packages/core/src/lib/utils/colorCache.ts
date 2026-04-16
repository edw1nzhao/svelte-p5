/**
 * Lazy cache for CSS color strings.
 *
 * p5.color() allocates a p5.Color instance on every call (object + typed
 * arrays + regex parse). Calling it in a draw loop — e.g. to colorize per
 * speaker or per data-point — leaks a lot of garbage. Use a ColorCache to
 * compute each color once and reuse the CSS string.
 *
 * @example
 * ```ts
 * const colors = createColorCache<string>();
 * const forSpeaker = (id: string, hue: number) =>
 *   colors.get(id, () => `hsl(${hue}, 80%, 60%)`);
 *
 * // in sketch:
 * p.fill(forSpeaker(point.speaker, point.hue));
 * ```
 */
export interface ColorCache<K = string> {
	get(key: K, compute: () => string): string;
	set(key: K, value: string): void;
	has(key: K): boolean;
	clear(): void;
	readonly size: number;
}

export function createColorCache<K = string>(): ColorCache<K> {
	const cache = new Map<K, string>();
	return {
		get(key, compute) {
			let v = cache.get(key);
			if (v === undefined) {
				v = compute();
				cache.set(key, v);
			}
			return v;
		},
		set(key, value) {
			cache.set(key, value);
		},
		has(key) {
			return cache.has(key);
		},
		clear() {
			cache.clear();
		},
		get size() {
			return cache.size;
		}
	};
}
