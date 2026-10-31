import { BRIDGE_RANGES, usesBridge, type BridgeValues } from './bridge.js';

function indent(code: string, prefix: string): string {
	return code
		.replace(/\s+$/, '')
		.split('\n')
		.map((line) => (line.trim() ? prefix + line : ''))
		.join('\n');
}

/** Builds a complete `.svelte` file that runs `body` through svelte-p5. */
export function toSvelteComponent(body: string, bridge: BridgeValues): string {
	const withBridge = usesBridge(body);
	const sketchBody = indent(body.replace(/<\/script/gi, '<\\/script'), '\t\t');
	const { size, speed } = BRIDGE_RANGES;

	const imports = withBridge
		? `\timport { createP5Bridge } from 'svelte-p5';\n\timport { Sketch } from 'svelte-p5-components';`
		: `\timport { Sketch } from 'svelte-p5-components';`;
	const bridgeDecl = withBridge
		? `\n\tconst bridge = createP5Bridge({ color: ${JSON.stringify(bridge.color)}, size: ${bridge.size}, speed: ${bridge.speed} });\n`
		: '';
	const controls = withBridge
		? `
<div class="controls">
	<label>Colour <input type="color" bind:value={bridge.state.color} /></label>
	<label>
		Size
		<input type="range" min="${size.min}" max="${size.max}" step="${size.step}" bind:value={bridge.state.size} />
	</label>
	<label>
		Speed
		<input type="range" min="${speed.min}" max="${speed.max}" step="${speed.step}" bind:value={bridge.state.speed} />
	</label>
</div>
`
		: '';

	return `<script>
${imports}
${bridgeDecl}
	/** @param {import('p5').default} p */
	const sketch = (p) => {
${sketchBody}
	};
</script>

<div class="sketch">
	<Sketch {sketch} />
</div>
${controls}
<style>
	.sketch {
		width: 100%;
		height: 400px;
	}${
		withBridge
			? `
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 0.75rem;
	}`
			: ''
	}
</style>
`;
}
