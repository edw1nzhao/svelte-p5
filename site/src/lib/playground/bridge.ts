export interface BridgeValues {
	color: string;
	size: number;
	speed: number;
}

export type LoopMode = 'always' | 'demand';

export const BRIDGE_DEFAULTS: BridgeValues = { color: '#6366f1', size: 24, speed: 1 };

export const BRIDGE_RANGES = {
	size: { min: 4, max: 80, step: 1 },
	speed: { min: 0, max: 4, step: 0.1 }
} as const;

export function usesBridge(code: string): boolean {
	return /\bbridge\b/.test(code);
}
