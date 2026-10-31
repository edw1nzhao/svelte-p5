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

declare global {
	interface Window {
		__e2e: E2EState;
	}
}
