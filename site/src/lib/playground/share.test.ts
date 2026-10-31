import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples.js';
import { decodeSketch, encodeSketch, readShareToken, shareHash } from './share.js';

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
});
