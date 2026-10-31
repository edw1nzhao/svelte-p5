import { describe, expect, it } from 'vitest';
import { compile } from 'svelte/compiler';
import { BRIDGE_DEFAULTS } from './bridge.js';
import { EXAMPLES } from './examples.js';
import { toSvelteComponent } from './svelte-export.js';

function compiles(source: string) {
	return compile(source, { filename: 'Sketch.svelte', generate: 'client' });
}

describe('toSvelteComponent', () => {
	for (const example of EXAMPLES) {
		it(`compiles the "${example.label}" example without warnings`, () => {
			const result = compiles(toSvelteComponent(example.code, BRIDGE_DEFAULTS, example.loop));
			expect(result.warnings.map((w) => w.message)).toEqual([]);
			expect(result.js.code).toContain('svelte-p5-components');
		});
	}

	it('wires the bridge and controls only when the sketch reads it', () => {
		const withBridge = toSvelteComponent('p.draw = () => p.background(bridge.state.color);', {
			color: '#ff0000',
			size: 10,
			speed: 2
		});
		expect(withBridge).toContain("import { createP5Bridge } from 'svelte-p5';");
		expect(withBridge).toContain('createP5Bridge({ color: "#ff0000", size: 10, speed: 2 })');
		expect(withBridge).toContain('bind:value={bridge.state.speed}');

		const plain = toSvelteComponent('p.draw = () => p.background(0);', BRIDGE_DEFAULTS);
		expect(plain).not.toContain('createP5Bridge');
		expect(plain).not.toContain('bind:value');
		compiles(plain);
	});

	it('places the body inside the sketch function', () => {
		const out = toSvelteComponent(
			'p.setup = () => {\n  p.createCanvas(10, 10);\n};',
			BRIDGE_DEFAULTS
		);
		expect(out).toContain(
			'\tconst sketch = (p) => {\n\t\tp.setup = () => {\n\t\t  p.createCanvas(10, 10);\n\t\t};\n\t};'
		);
	});

	it('keeps a closing script tag inside a string from ending the block', () => {
		const out = toSvelteComponent("p.draw = () => console.log('</script>');", BRIDGE_DEFAULTS);
		expect(() => compiles(out)).not.toThrow();
	});

	it('carries loop="demand" and hands the bridge to Sketch so controls trigger redraws', () => {
		const demand = EXAMPLES.find((e) => e.loop === 'demand')!;
		const out = toSvelteComponent(demand.code, BRIDGE_DEFAULTS, 'demand');
		expect(out).toContain('<Sketch {sketch} {bridge} loop="demand" />');

		const plain = toSvelteComponent('p.draw = () => p.background(0);', BRIDGE_DEFAULTS, 'demand');
		expect(plain).toContain('<Sketch {sketch} loop="demand" />');
	});

	it('omits the loop attribute for the default mode', () => {
		const out = toSvelteComponent('p.draw = () => p.background(0);', BRIDGE_DEFAULTS);
		expect(out).toContain('<Sketch {sketch} />');
	});
});
