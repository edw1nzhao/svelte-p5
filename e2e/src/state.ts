export interface FrameSnapshot {
	cssWidth: number;
	cssHeight: number;
	backingWidth: number;
	backingHeight: number;
	density: number;
}

export interface E2EState {
	p5Version: string;
	events: string[];
	readyCount: number;
	firstFrame: FrameSnapshot | null;
	frames: number;
	disableFriendlyErrors: boolean | undefined;
}

export interface TimelineE2EState {
	currentTime: number;
	view: { start: number; end: number } | null;
}

declare global {
	interface Window {
		__e2e: E2EState;
		__timeline: TimelineE2EState;
	}
}

export interface LifecycleE2EState {
	created: number;
	removed: number;
	setupStarted: number;
	setupFinished: number;
	ready: number;
	frames: number;
	release(): void;
}

declare global {
	interface Window {
		__lifecycle: LifecycleE2EState;
	}
}
