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

export interface DemandE2EState {
	frames: number;
	ready: boolean;
	setRadius(r: number): void;
	invalidate(): void;
	resize(width: number): void;
}

declare global {
	interface Window {
		__demand: DemandE2EState;
	}
}

export interface ExportE2EState {
	ready: boolean;
	stop(): void;
	live(): {
		backingWidth: number;
		backingHeight: number;
		cssWidth: string;
		density: number;
		frameCount: number;
		pixels: string;
	};
	exportSize(
		options?: import('svelte-p5').ExportOptions
	): Promise<{ width: number; height: number; type: string }>;
	exportInk(options?: import('svelte-p5').ExportOptions): Promise<number>;
	step(count: number): Promise<{ frameCount: number; width: number }[]>;
}

declare global {
	interface Window {
		__export: ExportE2EState;
	}
}

export interface AddonE2EState {
	version: string;
	registrations: number;
	log: string[];
	ready: number;
	postdrawFrames?: number;
	remount(): void;
}

declare global {
	interface Window {
		__addon: AddonE2EState;
	}
}
