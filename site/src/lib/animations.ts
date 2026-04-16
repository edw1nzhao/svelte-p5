/**
 * Tiny wrappers around anime.js v4 for site entry animations.
 *
 * All helpers no-op when `prefers-reduced-motion: reduce` is on, and they
 * gracefully bail in non-browser environments (SSR safety).
 */

import { animate, stagger, type AnimationParams } from 'animejs';

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return true;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fade + slide a single element up into place once on mount.
 * Pass an HTMLElement (typically captured via `bind:this`).
 */
export function fadeUp(el: HTMLElement | null, opts: Partial<AnimationParams> = {}) {
	if (!el || prefersReducedMotion()) return;
	el.style.opacity = '0';
	el.style.transform = 'translateY(12px)';
	animate(el, {
		opacity: [0, 1],
		translateY: [12, 0],
		duration: 520,
		ease: 'out(3)',
		...opts
	});
}

/**
 * Stagger fade-up across a group of children. Pass the parent and a CSS
 * selector for the items inside it.
 */
export function staggerFadeUp(
	parent: HTMLElement | null,
	selector: string,
	opts: Partial<AnimationParams> & { staggerMs?: number; startDelay?: number } = {}
) {
	if (!parent || prefersReducedMotion()) return;
	const items = Array.from(parent.querySelectorAll<HTMLElement>(selector));
	if (!items.length) return;

	for (const item of items) {
		item.style.opacity = '0';
		item.style.transform = 'translateY(14px)';
	}

	const { staggerMs = 70, startDelay = 0, ...rest } = opts;
	animate(items, {
		opacity: [0, 1],
		translateY: [14, 0],
		duration: 520,
		ease: 'out(3)',
		delay: stagger(staggerMs, { start: startDelay }),
		...rest
	});
}
