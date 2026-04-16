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

	it('uses the custom formatTime prop for both edge labels and the current-time readout', () => {
		const formatTime = (s: number) => `[${Math.round(s)}s]`;
		const { container } = render(TimelineScrubber, {
			props: { duration: 120, currentTime: 42, formatTime }
		});
		const text = container.textContent ?? '';
		expect(text).toContain('[0s]');
		expect(text).toContain('[120s]');
		expect(text).toContain('[42s]');
	});
});
