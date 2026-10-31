import { describe, it, expect, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent, within } from '@testing-library/svelte';
import TimelineTrack, { type TimelineViewContext } from './TimelineTrack.svelte';
import TimelineScrubber from './TimelineScrubber.svelte';

// happy-dom has no layout: map clientX 1:1 onto a 100px-wide track at left 0.
function stubTrackRect(container: HTMLElement) {
	const track = container.querySelector('.timeline-track') as HTMLElement;
	track.getBoundingClientRect = () =>
		({ left: 0, top: 0, width: 100, height: 32, right: 100, bottom: 32, x: 0, y: 0 }) as DOMRect;
	track.setPointerCapture = () => {};
	return track;
}

function q(container: HTMLElement, selector: string) {
	return container.querySelector(selector) as HTMLElement | null;
}

// happy-dom's WheelEvent drops modifier keys and clientX from its init dict.
function wheel(init: WheelEventInit): WheelEvent {
	const event = new WheelEvent('wheel', { ...init, cancelable: true });
	for (const key of ['ctrlKey', 'metaKey', 'clientX'] as const) {
		if (init[key] !== undefined) Object.defineProperty(event, key, { value: init[key] });
	}
	return event;
}

async function dragRail(track: HTMLElement, from: number, to: number, init: PointerEventInit = {}) {
	await fireEvent.pointerDown(track, { clientX: from, pointerId: 1, ...init });
	await fireEvent.pointerMove(document, { clientX: to, pointerId: 1, ...init });
	await fireEvent.pointerUp(document, { clientX: to, pointerId: 1, ...init });
}

describe('<TimelineTrack> view window', () => {
	it('maps the playhead, progress and selection through a controlled view', () => {
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 30, viewStart: 20, viewEnd: 40 }
		});
		expect(q(container, '.timeline-track__playhead')?.style.left).toBe('50%');
		expect(q(container, '.timeline-track__progress')?.style.width).toBe('50%');
	});

	it('hides the playhead and off-view handles, and clips the selection band', () => {
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				currentTime: 80,
				selectionStart: 10,
				selectionEnd: 30,
				viewStart: 20,
				viewEnd: 40
			}
		});
		expect(q(container, '.timeline-track__playhead')).toBeNull();
		expect(q(container, '.timeline-track__handle--start')).toBeNull();
		expect(q(container, '.timeline-track__handle--end')?.style.left).toBe('50%');
		const band = q(container, '.timeline-track__selection');
		expect(band?.style.left).toBe('0%');
		expect(band?.style.width).toBe('50%');
	});

	it('clips segments to the view and drops those outside it', () => {
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				viewStart: 20,
				viewEnd: 40,
				segments: [
					{ id: 'a', start: 0, end: 10 },
					{ id: 'b', start: 30, end: 60 }
				]
			}
		});
		const bands = container.querySelectorAll<HTMLElement>('.timeline-track__segment');
		expect(bands).toHaveLength(1);
		expect(bands[0]?.style.left).toBe('50%');
		expect(bands[0]?.style.width).toBe('50%');
	});

	it('drags a selection handle in view time while zoomed', async () => {
		const onSelectionChange = vi.fn();
		const { container } = render(TimelineTrack, {
			props: {
				duration: 100,
				selectionStart: 22,
				selectionEnd: 30,
				viewStart: 20,
				viewEnd: 40,
				onSelectionChange
			}
		});
		stubTrackRect(container);
		const handle = q(container, '.timeline-track__handle--end') as HTMLElement;
		handle.setPointerCapture = () => {};
		await fireEvent.pointerDown(handle, { clientX: 50, pointerId: 1 });
		await fireEvent.pointerMove(document, { clientX: 75, pointerId: 1 });
		await fireEvent.pointerUp(document, { clientX: 75, pointerId: 1 });
		expect(onSelectionChange.mock.calls.at(-1)?.[0]).toEqual({ start: 22, end: 35 });
	});

	it('steps the arrow keys by a fraction of the view, not the duration', async () => {
		const onSeek = vi.fn();
		const { container } = render(TimelineTrack, {
			props: { duration: 100, currentTime: 30, viewStart: 20, viewEnd: 40, onSeek }
		});
		await fireEvent.keyDown(q(container, '.timeline-track')!, { key: 'ArrowRight' });
		expect(onSeek.mock.calls.at(-1)?.[0]).toBeCloseTo(30.2, 10);
	});

	it('renders the underlay snippet with the view and a percent mapper', () => {
		const seen: TimelineViewContext[] = [];
		const underlay = createRawSnippet((ctx: () => TimelineViewContext) => {
			seen.push(ctx());
			return { render: () => `<i class="probe"></i>` };
		});
		const { container } = render(TimelineTrack, {
			props: { duration: 100, viewStart: 20, viewEnd: 40, underlay }
		});
		expect(q(container, '.timeline-track__underlay .probe')).not.toBeNull();
		expect(seen[0]?.view).toEqual({ start: 20, end: 40 });
		expect(seen[0]?.timeToPercent(25)).toBe(25);
	});

	it('reports the track bounds on mount', () => {
		const onBoundsChange = vi.fn();
		const proto = HTMLElement.prototype.getBoundingClientRect;
		HTMLElement.prototype.getBoundingClientRect = () =>
			({ left: 40, right: 440, width: 400, top: 0, bottom: 32, height: 32 }) as DOMRect;
		try {
			render(TimelineTrack, { props: { duration: 100, onBoundsChange } });
			expect(onBoundsChange).toHaveBeenCalledWith({ left: 40, right: 440, width: 400 });
		} finally {
			HTMLElement.prototype.getBoundingClientRect = proto;
		}
	});
});

describe('<TimelineTrack> without zoomable', () => {
	it('keeps rail drag as a scrub and ignores wheel and zoom keys', async () => {
		const onSeek = vi.fn();
		const onViewChange = vi.fn();
		const { container } = render(TimelineTrack, {
			props: { duration: 100, onSeek, onViewChange }
		});
		const track = stubTrackRect(container);
		await dragRail(track, 20, 60);
		track.dispatchEvent(wheel({ deltaY: -100, ctrlKey: true, clientX: 50 }));
		await fireEvent.keyDown(track, { key: '+' });
		expect(onSeek.mock.calls.map((c) => c[0])).toEqual([20, 60]);
		expect(onViewChange).not.toHaveBeenCalled();
		expect(q(container, '.timeline-track__zoom-region')).toBeNull();
	});
});

describe('<TimelineTrack zoomable>', () => {
	function setup(props: Record<string, unknown> = {}) {
		const onSeek = vi.fn();
		const onViewChange = vi.fn();
		const r = render(TimelineTrack, {
			props: { duration: 100, zoomable: true, onSeek, onViewChange, ...props }
		});
		return { ...r, track: stubTrackRect(r.container), onSeek, onViewChange };
	}

	it('drags the rail to zoom to the dragged range without seeking', async () => {
		const { container, track, onSeek, onViewChange } = setup({ currentTime: 30 });
		await fireEvent.pointerDown(track, { clientX: 60, pointerId: 1 });
		await fireEvent.pointerMove(document, { clientX: 20, pointerId: 1 });
		expect(q(container, '.timeline-track__zoom-region')?.style.left).toBe('20%');
		await fireEvent.pointerUp(document, { clientX: 20, pointerId: 1 });
		expect(onViewChange).toHaveBeenCalledWith({ start: 20, end: 60 });
		expect(onSeek).not.toHaveBeenCalled();
		expect(q(container, '.timeline-track__zoom-region')).toBeNull();
		expect(q(container, '.timeline-track__playhead')?.style.left).toBe('25%');
	});

	it('seeks on a click that moves less than the drag threshold', async () => {
		const { track, onSeek, onViewChange } = setup();
		await dragRail(track, 40, 42);
		expect(onSeek).toHaveBeenCalledWith(40);
		expect(onViewChange).not.toHaveBeenCalled();
	});

	it('widens a drag narrower than minViewDuration', async () => {
		const { track, onViewChange } = setup({ minViewDuration: 20 });
		await dragRail(track, 40, 50);
		expect(onViewChange).toHaveBeenCalledWith({ start: 35, end: 55 });
	});

	it('maps a drag inside a zoomed view to view time', async () => {
		const { track, onViewChange } = setup({ viewStart: 20, viewEnd: 40 });
		await dragRail(track, 25, 75);
		expect(onViewChange).toHaveBeenCalledWith({ start: 25, end: 35 });
	});

	it('pans on alt-drag and middle-button drag', async () => {
		const { track, onViewChange } = setup({ viewStart: 20, viewEnd: 40 });
		await dragRail(track, 50, 25, { altKey: true });
		expect(onViewChange.mock.calls.at(-1)?.[0]).toEqual({ start: 25, end: 45 });
		await dragRail(track, 50, 75, { button: 1 });
		expect(onViewChange.mock.calls.at(-1)?.[0]).toEqual({ start: 20, end: 40 });
	});

	it('zooms on a two-finger pinch around the midpoint', async () => {
		const { track, onViewChange } = setup();
		const touch = { pointerType: 'touch' };
		await fireEvent.pointerDown(track, { clientX: 40, pointerId: 1, ...touch });
		await fireEvent.pointerDown(track, { clientX: 60, pointerId: 2, ...touch });
		await fireEvent.pointerMove(document, { clientX: 20, pointerId: 1, ...touch });
		await fireEvent.pointerMove(document, { clientX: 80, pointerId: 2, ...touch });
		const last = onViewChange.mock.calls.at(-1)?.[0];
		expect(last.start).toBeCloseTo(100 / 3, 6);
		expect(last.end).toBeCloseTo(200 / 3, 6);
		await fireEvent.pointerUp(document, { clientX: 20, pointerId: 1, ...touch });
		await fireEvent.pointerUp(document, { clientX: 80, pointerId: 2, ...touch });
	});

	it('zooms on ctrl/cmd-wheel around the pointer', async () => {
		const { track, onViewChange } = setup();
		const event = wheel({ deltaY: -100, ctrlKey: true, clientX: 25 });
		track.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		const v = onViewChange.mock.calls.at(-1)?.[0];
		expect(v.end - v.start).toBeCloseTo(100 / 1.15, 6);
		expect((25 - v.start) / (v.end - v.start)).toBeCloseTo(0.25, 6);
	});

	it('pans on a plain wheel only when there is somewhere to go', async () => {
		const { track, onViewChange } = setup();
		const atFull = wheel({ deltaY: 100 });
		track.dispatchEvent(atFull);
		expect(atFull.defaultPrevented).toBe(false);
		expect(onViewChange).not.toHaveBeenCalled();

		await fireEvent.keyDown(track, { key: '+' });
		const panned = wheel({ deltaX: 20 });
		track.dispatchEvent(panned);
		expect(panned.defaultPrevented).toBe(true);
		const before = onViewChange.mock.calls.at(-2)?.[0];
		const after = onViewChange.mock.calls.at(-1)?.[0];
		expect(after.start - before.start).toBeCloseTo(0.1 * (before.end - before.start), 6);
	});

	it('zooms, pans and fits from the keyboard', async () => {
		const { track, onViewChange } = setup({ currentTime: 50 });
		await fireEvent.keyDown(track, { key: '+' });
		expect(onViewChange.mock.calls.at(-1)?.[0]).toEqual({ start: 15, end: 85 });
		await fireEvent.keyDown(track, { key: ']' });
		expect(onViewChange.mock.calls.at(-1)?.[0].start).toBeCloseTo(22, 10);
		await fireEvent.keyDown(track, { key: '-' });
		await fireEvent.keyDown(track, { key: '0' });
		expect(onViewChange.mock.calls.at(-1)?.[0]).toEqual({ start: 0, end: 100 });
		expect(track.getAttribute('aria-keyshortcuts')).toBe('+ - 0 [ ]');
	});
});

describe('<TimelineScrubber> zoom controls', () => {
	it('renders no zoom controls unless zoomable', () => {
		const { container } = render(TimelineScrubber, { props: { duration: 100 } });
		expect(q(container, '.timeline-scrubber__zoom')).toBeNull();
	});

	it('zooms in about the view center, then fits', async () => {
		const onViewChange = vi.fn();
		const { container } = render(TimelineScrubber, {
			props: { duration: 100, zoomable: true, onViewChange }
		});
		const { getByLabelText } = within(container);
		const fit = getByLabelText(/Zoom to fit/) as HTMLButtonElement;
		expect(fit.disabled).toBe(true);
		await fireEvent.click(getByLabelText('Zoom in'));
		expect(onViewChange).toHaveBeenLastCalledWith({ start: 15, end: 85 });
		expect(fit.disabled).toBe(false);
		await fireEvent.click(fit);
		expect(onViewChange).toHaveBeenLastCalledWith({ start: 0, end: 100 });
	});

	it('disables zoom in at the minimum view duration', () => {
		const { container } = render(TimelineScrubber, {
			props: { duration: 100, zoomable: true, viewStart: 10, viewEnd: 20, minViewDuration: 10 }
		});
		expect((within(container).getByLabelText('Zoom in') as HTMLButtonElement).disabled).toBe(true);
	});
});
