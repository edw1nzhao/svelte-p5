import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import SplitPane from './SplitPane.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('<SplitPane>', () => {
	it('renders both panels when not collapsed', () => {
		const { container } = render(SplitPane, {
			props: {
				first: snippet('<div>FIRST</div>'),
				second: snippet('<div>SECOND</div>')
			}
		});
		expect(container.textContent).toContain('FIRST');
		expect(container.textContent).toContain('SECOND');
		expect(container.querySelectorAll('.split-pane__panel')).toHaveLength(2);
	});

	it('shows the divider between panels', () => {
		const { container } = render(SplitPane, {
			props: { first: snippet('<div>a</div>'), second: snippet('<div>b</div>') }
		});
		expect(container.querySelector('.split-pane__divider')).not.toBeNull();
	});

	it('hides the divider when collapsed', () => {
		const { container } = render(SplitPane, {
			props: {
				first: snippet('<div>a</div>'),
				second: snippet('<div>b</div>'),
				collapsed: true
			}
		});
		expect(container.querySelector('.split-pane__divider')).toBeNull();
	});

	it('applies orientation class to the root', () => {
		const { container: v } = render(SplitPane, {
			props: {
				first: snippet('<div>a</div>'),
				second: snippet('<div>b</div>'),
				orientation: 'vertical'
			}
		});
		expect(v.querySelector('.split-pane.vertical')).not.toBeNull();

		const { container: h } = render(SplitPane, {
			props: {
				first: snippet('<div>a</div>'),
				second: snippet('<div>b</div>'),
				orientation: 'horizontal'
			}
		});
		expect(h.querySelector('.split-pane.horizontal')).not.toBeNull();
	});

	it('reflects sizes prop in inline styles on panels', () => {
		const { container } = render(SplitPane, {
			props: {
				first: snippet('<div>a</div>'),
				second: snippet('<div>b</div>'),
				sizes: [30, 70] as [number, number]
			}
		});
		const panels = container.querySelectorAll('.split-pane__panel') as NodeListOf<HTMLElement>;
		expect(panels[0]?.style.height).toBe('30%');
		expect(panels[1]?.style.height).toBe('70%');
	});

	it('arrow keys resize and fire onresize', async () => {
		const onresize = vi.fn();
		const { container } = render(SplitPane, {
			props: {
				first: snippet('<div>a</div>'),
				second: snippet('<div>b</div>'),
				sizes: [50, 50] as [number, number],
				orientation: 'vertical',
				onresize
			}
		});
		const divider = container.querySelector('.split-pane__divider') as HTMLElement;
		await fireEvent.keyDown(divider, { key: 'ArrowDown' });

		expect(onresize).toHaveBeenCalledTimes(1);
		const call = onresize.mock.calls[0];
		if (!call) throw new Error('onresize call unexpectedly missing');
		expect(call[0].sizes[0]).toBeGreaterThan(50);
		expect(call[0].sizes[1]).toBeLessThan(50);
		expect(call[0].sizes[0] + call[0].sizes[1]).toBeCloseTo(100);
	});
});
