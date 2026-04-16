import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TimelineTrack, { type TimelineSegment } from './TimelineTrack.svelte';

describe('<TimelineTrack>', () => {
	it('renders a playhead at the correct percent for the currentTime', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 25 }
		});
		const playhead = container.querySelector('.timeline-track__playhead') as HTMLElement;
		expect(playhead).not.toBeNull();
		expect(playhead.style.left).toBe('25%');
	});

	it('omits the playhead when showPlayhead is false', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 50, showPlayhead: false }
		});
		expect(container.querySelector('.timeline-track__playhead')).toBeNull();
	});

	it('renders one band per segment with the correct width percent', () => {
		const segments: TimelineSegment[] = [
			{ id: 's1', start: 0, end: 20 },
			{ id: 's2', start: 40, end: 60, label: 'Middle' }
		];
		const { container } = render(TimelineTrack, {
			props: { duration: 100, segments }
		});
		const bands = container.querySelectorAll('.timeline-track__segment') as NodeListOf<HTMLElement>;
		expect(bands).toHaveLength(2);
		expect(bands[0]?.style.left).toBe('0%');
		expect(bands[0]?.style.width).toBe('20%');
		expect(bands[1]?.style.left).toBe('40%');
		expect(bands[1]?.style.width).toBe('20%');
		expect(bands[1]?.textContent).toContain('Middle');
	});

	it('onSegmentClick fires the full segment when a band is clicked', async () => {
		const segments: TimelineSegment[] = [{ id: 's1', start: 0, end: 20, label: 'Intro' }];
		const onSegmentClick = vi.fn();
		const { container } = render(TimelineTrack, {
			props: { duration: 100, segments, onSegmentClick }
		});

		const band = container.querySelector('.timeline-track__segment') as HTMLElement;
		await fireEvent.click(band);

		expect(onSegmentClick).toHaveBeenCalledTimes(1);
		expect(onSegmentClick.mock.calls[0]?.[0]?.id).toBe('s1');
	});

	it('view window handles render when viewWindow is provided', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 50, viewWindow: { start: 20, end: 80 } }
		});
		expect(container.querySelectorAll('.timeline-track__handle')).toHaveLength(2);
	});

	it('view window handles hidden when showViewWindowHandles=false', () => {
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				viewWindow: { start: 20, end: 80 },
				showViewWindowHandles: false
			}
		});
		expect(container.querySelectorAll('.timeline-track__handle')).toHaveLength(0);
	});

	it('has role=slider with aria-valuemin/max/now reflecting view window', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 30, viewWindow: { start: 10, end: 90 } }
		});
		const track = container.querySelector('.timeline-track') as HTMLElement;
		expect(track.getAttribute('role')).toBe('slider');
		expect(track.getAttribute('aria-valuemin')).toBe('10');
		expect(track.getAttribute('aria-valuemax')).toBe('90');
		expect(track.getAttribute('aria-valuenow')).toBe('30');
	});
});
