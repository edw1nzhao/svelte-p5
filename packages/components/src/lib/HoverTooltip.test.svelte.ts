import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import HoverTooltip from './HoverTooltip.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('<HoverTooltip>', () => {
	it('does not render when show is false', () => {
		const { container } = render(HoverTooltip, {
			props: {
				children: snippet('<span>HELLO</span>'),
				anchor: { x: 100, y: 100 },
				show: false
			}
		});
		expect(container.querySelector('.hover-tooltip')).toBeNull();
	});

	it('does not render when anchor is null even if show is true', () => {
		const { container } = render(HoverTooltip, {
			props: {
				children: snippet('<span>HELLO</span>'),
				anchor: null,
				show: true
			}
		});
		expect(container.querySelector('.hover-tooltip')).toBeNull();
	});

	it('renders children content when visible', () => {
		const { container } = render(HoverTooltip, {
			props: {
				children: snippet('<span>HELLO</span>'),
				anchor: { x: 100, y: 100 },
				show: true
			}
		});
		expect(container.querySelector('.hover-tooltip')?.textContent).toContain('HELLO');
	});

	it('applies role=tooltip for assistive tech', () => {
		const { container } = render(HoverTooltip, {
			props: {
				children: snippet('<span>x</span>'),
				anchor: { x: 50, y: 50 },
				show: true
			}
		});
		expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
	});

	it('renders a triangle arrow by default and omits it when triangle=false', () => {
		const { container: withArrow } = render(HoverTooltip, {
			props: {
				children: snippet('<span>x</span>'),
				anchor: { x: 50, y: 50 },
				show: true
			}
		});
		expect(withArrow.querySelector('.hover-tooltip__arrow')).not.toBeNull();

		const { container: noArrow } = render(HoverTooltip, {
			props: {
				children: snippet('<span>x</span>'),
				anchor: { x: 50, y: 50 },
				show: true,
				triangle: false
			}
		});
		expect(noArrow.querySelector('.hover-tooltip__arrow')).toBeNull();
	});
});
