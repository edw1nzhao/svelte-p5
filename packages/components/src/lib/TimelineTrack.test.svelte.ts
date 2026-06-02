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

	it('selection handles render when selectionStart/End are provided', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 50, selectionStart: 20, selectionEnd: 80 }
		});
		expect(container.querySelectorAll('.timeline-track__handle')).toHaveLength(2);
	});

	it('selection handles hidden when showSelection=false', () => {
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				selectionStart: 20,
				selectionEnd: 80,
				showSelection: false
			}
		});
		expect(container.querySelectorAll('.timeline-track__handle')).toHaveLength(0);
	});

	// --- playheadFollowsSelectionStart -------------------------------------
	//
	// Dragging the start handle goes through document-level pointermove
	// listeners, and the time math depends on the track's bounding rect.
	// happy-dom reports a 0-width rect by default, so we stub it to map
	// clientX 1:1 onto a 100-unit timeline (width 100 at left 0).
	function stubTrackRect(container: HTMLElement) {
		const track = container.querySelector('.timeline-track') as HTMLElement;
		track.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 100, height: 32, right: 100, bottom: 32, x: 0, y: 0 }) as DOMRect;
		return track;
	}

	async function dragStartHandle(container: HTMLElement, toClientX: number) {
		const handle = container.querySelector('.timeline-track__handle--start') as HTMLElement;
		handle.setPointerCapture = () => {};
		await fireEvent.pointerDown(handle, { clientX: 20, pointerId: 1 });
		// Drag handled at the document level.
		await fireEvent.pointerMove(document, { clientX: toClientX, pointerId: 1 });
		await fireEvent.pointerUp(document, { clientX: toClientX, pointerId: 1 });
	}

	it('with playheadFollowsSelectionStart, dragging the start handle moves currentTime + seeks', async () => {
		const onSeek = vi.fn();
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				currentTime: 0,
				selectionStart: 20,
				selectionEnd: 80,
				playheadFollowsSelectionStart: true,
				onSeek
			}
		});
		stubTrackRect(container);
		await dragStartHandle(container, 30);

		// Moving the start handle to clientX 30 maps to time 30 on the track.
		expect(onSeek).toHaveBeenCalled();
		expect(onSeek.mock.calls.at(-1)?.[0]).toBeCloseTo(30, 5);
		const playhead = container.querySelector('.timeline-track__playhead') as HTMLElement;
		expect(playhead.style.left).toBe('30%');
	});

	it('by default, dragging the start handle does NOT move the playhead', async () => {
		const onSeek = vi.fn();
		const onSelectionChange = vi.fn();
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				currentTime: 0,
				selectionStart: 20,
				selectionEnd: 80,
				onSeek,
				onSelectionChange
			}
		});
		stubTrackRect(container);
		await dragStartHandle(container, 30);

		// Selection still updates, but the playhead stays put and no seek fires.
		expect(onSelectionChange).toHaveBeenCalled();
		expect(onSeek).not.toHaveBeenCalled();
		const playhead = container.querySelector('.timeline-track__playhead') as HTMLElement;
		expect(playhead.style.left).toBe('0%');
	});

	it('has role=slider with aria covering full duration', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 30, selectionStart: 10, selectionEnd: 90 }
		});
		const track = container.querySelector('.timeline-track') as HTMLElement;
		expect(track.getAttribute('role')).toBe('slider');
		expect(track.getAttribute('aria-valuemin')).toBe('0');
		expect(track.getAttribute('aria-valuemax')).toBe('100');
		expect(track.getAttribute('aria-valuenow')).toBe('30');
	});
});
