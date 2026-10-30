import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TimelineScrubber from './TimelineScrubber.svelte';

describe('<TimelineScrubber>', () => {
	it('shows the play icon when paused and pause when playing', () => {
		const { container: paused } = render(TimelineScrubber, {
			props: { duration: 60, currentTime: 0, isPlaying: false }
		});
		expect(paused.querySelector('[aria-label="Play"]')).not.toBeNull();

		const { container: playing } = render(TimelineScrubber, {
			props: { duration: 60, currentTime: 0, isPlaying: true }
		});
		expect(playing.querySelector('[aria-label="Pause"]')).not.toBeNull();
	});

	it('clicking the play button fires onPlayToggle with the new state', async () => {
		const onPlayToggle = vi.fn();
		const { container } = render(TimelineScrubber, {
			props: { duration: 60, isPlaying: false, onPlayToggle }
		});
		const btn = container.querySelector('[aria-label="Play"]') as HTMLButtonElement;
		await fireEvent.click(btn);

		expect(onPlayToggle).toHaveBeenCalledWith(true);
	});

	it('cycles through the default speed presets on each speed-button click', async () => {
		const onSpeedChange = vi.fn();
		const { container } = render(TimelineScrubber, {
			props: { duration: 60, speed: 1, onSpeedChange }
		});
		const btn = container.querySelector('.timeline-scrubber__btn--speed') as HTMLButtonElement;

		await fireEvent.click(btn);
		expect(onSpeedChange).toHaveBeenLastCalledWith(2);
	});

	it('speedLocked disables the speed button and surfaces the reason via title', () => {
		const { container } = render(TimelineScrubber, {
			props: {
				duration: 60,
				speed: 8,
				speedLocked: true,
				speedLockedReason: 'Video is playing'
			}
		});
		const btn = container.querySelector('.timeline-scrubber__btn--speed') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
		expect(btn.classList.contains('is-locked')).toBe(true);
		expect(btn.getAttribute('title')).toContain('Video is playing');
	});

	it('clicking a locked speed button does NOT emit onSpeedChange', async () => {
		const onSpeedChange = vi.fn();
		const { container } = render(TimelineScrubber, {
			props: { duration: 60, speed: 2, speedLocked: true, onSpeedChange }
		});
		const btn = container.querySelector('.timeline-scrubber__btn--speed') as HTMLButtonElement;
		await fireEvent.click(btn);
		expect(onSpeedChange).not.toHaveBeenCalled();
	});

	it('uses the custom formatTime prop for the current-time and duration readout', () => {
		// YouTube-style readout shows `currentTime / duration`; there is no
		// separate start-edge label (that was the pre-redesign layout).
		const formatTime = (s: number) => `[${Math.round(s)}s]`;
		const { container } = render(TimelineScrubber, {
			props: { duration: 120, currentTime: 42, formatTime }
		});
		const text = container.textContent ?? '';
		expect(text).toContain('[42s]');
		expect(text).toContain('[120s]');
	});

	describe('time display with a selection', () => {
		const formatTime = (s: number) => `[${Math.round(s)}s]`;
		const endLabel = (container: HTMLElement) =>
			container.querySelector('.timeline-scrubber__time-total')?.textContent;
		const remainingLabel = (container: HTMLElement) =>
			container.querySelector('.timeline-scrubber__time-alt')?.textContent;

		it('shows the selection end instead of the duration', () => {
			const { container } = render(TimelineScrubber, {
				props: { duration: 120, currentTime: 10, selectionStart: 5, selectionEnd: 90, formatTime }
			});
			expect(endLabel(container)).toBe('[90s]');
		});

		it('counts remaining time down to the selection end', async () => {
			const { container } = render(TimelineScrubber, {
				props: { duration: 120, currentTime: 30, selectionStart: 0, selectionEnd: 90, formatTime }
			});
			await fireEvent.click(container.querySelector('.timeline-scrubber__time-display')!);
			expect(remainingLabel(container)).toBe('-[60s]');
		});

		it('shows the duration when no selection is set', () => {
			const { container } = render(TimelineScrubber, {
				props: { duration: 120, currentTime: 10, formatTime }
			});
			expect(endLabel(container)).toBe('[120s]');
		});

		it('shows the duration when the selection is hidden', () => {
			const { container } = render(TimelineScrubber, {
				props: {
					duration: 120,
					currentTime: 10,
					selectionStart: 5,
					selectionEnd: 90,
					showSelection: false,
					formatTime
				}
			});
			expect(endLabel(container)).toBe('[120s]');
		});

		it('shows the duration when showSelection is forced on without a start', () => {
			const { container } = render(TimelineScrubber, {
				props: { duration: 120, selectionEnd: 90, showSelection: true, formatTime }
			});
			expect(endLabel(container)).toBe('[120s]');
		});

		it('follows selectionEnd as it changes', async () => {
			const { container, rerender } = render(TimelineScrubber, {
				props: { duration: 120, currentTime: 10, selectionStart: 5, selectionEnd: 90, formatTime }
			});
			await rerender({ selectionEnd: 45 });
			expect(endLabel(container)).toBe('[45s]');
		});
	});
});
