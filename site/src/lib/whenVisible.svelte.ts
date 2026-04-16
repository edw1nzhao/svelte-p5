/**
 * Run a callback the first time an element scrolls into view.
 * Falls back to running immediately on browsers without IntersectionObserver
 * (basically: never; baseline 2017).
 */

export function whenVisible(
	el: HTMLElement | null,
	cb: (el: HTMLElement) => void,
	options: IntersectionObserverInit = { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
) {
	if (!el || typeof window === 'undefined') return;
	if (typeof IntersectionObserver === 'undefined') {
		cb(el);
		return;
	}

	const obs = new IntersectionObserver((entries, o) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				cb(entry.target as HTMLElement);
				o.unobserve(entry.target);
			}
		}
	}, options);
	obs.observe(el);
	return () => obs.disconnect();
}
