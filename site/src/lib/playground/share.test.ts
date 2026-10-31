import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples.js';
import { BRIDGE_DEFAULTS } from './bridge.js';
import {
	decodeSketch,
	encodeSketch,
	readShareSettings,
	readShareToken,
	shareHash
} from './share.js';

describe('sketch share links', () => {
	it('round-trips every example', async () => {
		for (const { code } of EXAMPLES) {
			expect(await decodeSketch(await encodeSketch(code))).toBe(code);
		}
	});

	it('round-trips unicode and empty input', async () => {
		for (const code of ['', 'p.text("héllo ✓ 日本", 10, 10);']) {
			expect(await decodeSketch(await encodeSketch(code))).toBe(code);
		}
	});

	it('produces a URL-safe token smaller than the source', async () => {
		const code = EXAMPLES[0]!.code;
		const token = await encodeSketch(code);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(token.length).toBeLessThan(code.length);
	});

	it('reads the token back from a location hash', async () => {
		const token = await encodeSketch('p.draw = () => {};');
		expect(readShareToken(shareHash(token))).toBe(token);
		expect(readShareToken('')).toBeNull();
		expect(readShareToken('#other=1')).toBeNull();
	});

	it('rejects malformed tokens', async () => {
		await expect(decodeSketch('not base64!')).rejects.toThrow();
		await expect(decodeSketch('AAAA')).rejects.toThrow();
	});

	it('carries the loop mode and bridge values beside the token', () => {
		const bridge = { color: '#ff8800', size: 40, speed: 2.5 };
		const hash = shareHash('abc', { loop: 'demand', bridge });
		expect(readShareToken(hash)).toBe('abc');
		expect(readShareSettings(hash)).toEqual({ loop: 'demand', bridge });
	});

	it('keeps old links working: no settings means the defaults', () => {
		expect(shareHash('abc')).toBe('#code=abc');
		expect(readShareSettings('#code=abc')).toEqual({ loop: 'always', bridge: BRIDGE_DEFAULTS });
	});

	it('ignores invalid settings and clamps numbers to the control ranges', () => {
		const settings = readShareSettings('#code=abc&loop=forever&color=red&size=9999&speed=-3');
		expect(settings).toEqual({
			loop: 'always',
			bridge: { color: BRIDGE_DEFAULTS.color, size: 80, speed: 0 }
		});
		expect(readShareSettings('#code=abc&size=NaN').bridge.size).toBe(BRIDGE_DEFAULTS.size);
	});
});
