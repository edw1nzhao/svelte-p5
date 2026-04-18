/**
 * Subtle 3D tilt-on-hover action.
 *
 * Tracks the cursor over the element and maps its position to a small
 * rotateX/rotateY transform. Tuned conservatively (6° max, 180ms ease)
 * so cards feel tactile without looking like a toy. Resets cleanly on
 * mouseleave. Coarse-pointer devices (touch) are skipped — the effect
 * only exists because the cursor carries a position; tap input doesn't.
 *
 * `prefers-reduced-motion: reduce` → no-op.
 */
export function tilt(node: HTMLElement, max: number = 6) {
	if (typeof window === 'undefined') return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (window.matchMedia('(pointer: coarse)').matches) return;

	let raf = 0;

	node.style.transition = 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)';
	node.style.transformStyle = 'preserve-3d';
	node.style.willChange = 'transform';

	function onMove(e: MouseEvent) {
		const rect = node.getBoundingClientRect();
		const px = (e.clientX - rect.left) / rect.width;
		const py = (e.clientY - rect.top) / rect.height;
		const ry = (px - 0.5) * 2 * max;
		const rx = (0.5 - py) * 2 * max;
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			node.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
		});
	}

	function onLeave() {
		cancelAnimationFrame(raf);
		node.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
	}

	node.addEventListener('mousemove', onMove);
	node.addEventListener('mouseleave', onLeave);

	return {
		destroy() {
			cancelAnimationFrame(raf);
			node.removeEventListener('mousemove', onMove);
			node.removeEventListener('mouseleave', onLeave);
		}
	};
}
