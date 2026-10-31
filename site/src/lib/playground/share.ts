import { BRIDGE_DEFAULTS, BRIDGE_RANGES, type BridgeValues, type LoopMode } from './bridge.js';

const HASH_KEY = 'code';

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
	if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('Invalid share token');
	const padded = text.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: GenericTransformStream): Promise<Uint8Array> {
	const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSketch(code: string): Promise<string> {
	const compressed = await pipe(
		new TextEncoder().encode(code),
		new CompressionStream('deflate-raw')
	);
	return toBase64Url(compressed);
}

export async function decodeSketch(token: string): Promise<string> {
	const bytes = await pipe(fromBase64Url(token), new DecompressionStream('deflate-raw'));
	return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export interface ShareSettings {
	loop: LoopMode;
	bridge: BridgeValues;
}

export function shareHash(token: string, settings?: ShareSettings): string {
	const params = new URLSearchParams({ [HASH_KEY]: token });
	if (settings) {
		if (settings.loop !== 'always') params.set('loop', settings.loop);
		params.set('color', settings.bridge.color);
		params.set('size', String(settings.bridge.size));
		params.set('speed', String(settings.bridge.speed));
	}
	return `#${params}`;
}

function readNumber(raw: string | null, range: { min: number; max: number }, fallback: number) {
	const n = raw === null || raw === '' ? NaN : Number(raw);
	return Number.isFinite(n) ? Math.min(range.max, Math.max(range.min, n)) : fallback;
}

/** Reads loop and bridge values from a share hash; anything missing or invalid falls back to the defaults. */
export function readShareSettings(hash: string): ShareSettings {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const color = params.get('color');
	return {
		loop: params.get('loop') === 'demand' ? 'demand' : 'always',
		bridge: {
			color: color && /^#[0-9a-f]{6}$/i.test(color) ? color : BRIDGE_DEFAULTS.color,
			size: readNumber(params.get('size'), BRIDGE_RANGES.size, BRIDGE_DEFAULTS.size),
			speed: readNumber(params.get('speed'), BRIDGE_RANGES.speed, BRIDGE_DEFAULTS.speed)
		}
	};
}

/** Returns the share token in a location hash, or null when there is none. */
export function readShareToken(hash: string): string | null {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const token = params.get(HASH_KEY);
	return token ? token : null;
}
