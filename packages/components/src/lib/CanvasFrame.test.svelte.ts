import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import CanvasFrame from './CanvasFrame.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('<CanvasFrame>', () => {
	it('renders the required canvas snippet inside the stage', () => {
		const { container } = render(CanvasFrame, {
			canvas: snippet('<div data-testid="canvas">CANVAS</div>')
		});

		const stage = container.querySelector('.canvas-frame__stage');
		expect(stage).not.toBeNull();
		expect(stage?.textContent).toContain('CANVAS');
	});

	it('omits optional regions when their snippets are absent', () => {
		const { container } = render(CanvasFrame, {
			canvas: snippet('<div>c</div>')
		});

		expect(container.querySelector('.canvas-frame__top')).toBeNull();
		expect(container.querySelector('.canvas-frame__bottom')).toBeNull();
		expect(container.querySelector('.canvas-frame__rail')).toBeNull();
		expect(container.querySelector('.canvas-frame__overlay')).toBeNull();
	});

	it('renders top, bottom, leftRail, rightRail when provided', () => {
		const { container } = render(CanvasFrame, {
			canvas: snippet('<div>c</div>'),
			top: snippet('<span>T</span>'),
			bottom: snippet('<span>B</span>'),
			leftRail: snippet('<span>L</span>'),
			rightRail: snippet('<span>R</span>')
		});

		expect(container.querySelector('.canvas-frame__top')?.textContent).toBe('T');
		expect(container.querySelector('.canvas-frame__bottom')?.textContent).toBe('B');
		const rails = container.querySelectorAll('.canvas-frame__rail');
		expect(rails).toHaveLength(2);
		expect(rails[0]?.textContent).toBe('L');
		expect(rails[1]?.textContent).toBe('R');
	});

	it('overlay region renders with the dedicated class that applies pointer-events:none', () => {
		// happy-dom doesn't resolve Svelte's scoped stylesheet cascade, so we
		// assert on the marker class instead of the computed value. The actual
		// CSS is covered by a Playwright smoke pass on docs/examples.
		const { container } = render(CanvasFrame, {
			canvas: snippet('<div>c</div>'),
			overlay: snippet('<div>o</div>')
		});

		const overlay = container.querySelector('.canvas-frame__overlay');
		expect(overlay).not.toBeNull();
	});

	it('forwards class and style to the root container', () => {
		const { container } = render(CanvasFrame, {
			canvas: snippet('<div>c</div>'),
			class: 'extra-class',
			style: 'background: red;'
		});

		const root = container.querySelector('.canvas-frame');
		expect(root?.classList.contains('extra-class')).toBe(true);
		expect((root as HTMLElement).style.background).toBe('red');
	});
});
