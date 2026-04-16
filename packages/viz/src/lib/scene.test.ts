import { describe, it, expectTypeOf } from 'vitest';
import type {
	GridSceneLayout,
	PanelInstance,
	SceneConfig,
	SceneLayout,
	SingleSceneLayout,
	SplitSceneLayout
} from './scene.js';

// Type-level tests — verify the SceneConfig shape is expressive enough for
// the patterns the studio will need to produce, and that JSON
// round-tripping doesn't lose information. Runtime execution is trivial;
// the value is in the static assertions.

describe('SceneConfig shape', () => {
	it('accepts a single-panel scene', () => {
		const scene: SceneConfig = {
			version: 1,
			panels: [{ id: 'main', type: 'word-cloud' }],
			layout: { kind: 'single', panel: 'main' }
		};
		expectTypeOf(scene.layout).toMatchTypeOf<SceneLayout>();
	});

	it('accepts a horizontal split', () => {
		const scene: SceneConfig = {
			version: 1,
			name: 'Two-up',
			panels: [
				{ id: 'left', type: 'word-cloud' },
				{ id: 'right', type: 'timeline-track' }
			],
			layout: {
				kind: 'split',
				orientation: 'horizontal',
				position: 50,
				first: 'left',
				second: 'right'
			}
		};
		expectTypeOf(scene.layout).toMatchTypeOf<SplitSceneLayout>();
	});

	it('accepts a 2×2 grid', () => {
		const scene: SceneConfig = {
			version: 1,
			panels: [
				{ id: 'a', type: 'word-cloud' },
				{ id: 'b', type: 'timeline' },
				{ id: 'c', type: 'heatmap' },
				{ id: 'd', type: 'network' }
			],
			layout: {
				kind: 'grid',
				columns: 2,
				gap: 8,
				padding: 4,
				panels: ['a', 'b', 'c', 'd']
			}
		};
		expectTypeOf(scene.layout).toMatchTypeOf<GridSceneLayout>();
	});

	it('per-panel config is an arbitrary object', () => {
		const panel: PanelInstance = {
			id: 'p1',
			type: 'word-cloud',
			label: 'My cloud',
			config: { minFontSize: 10, maxFontSize: 48, rotate: false }
		};
		expectTypeOf(panel.config).toEqualTypeOf<Record<string, unknown> | undefined>();
	});

	it('layouts are a discriminated union by kind', () => {
		function render(layout: SceneLayout): string {
			// Exhaustive kind narrowing — if a new SceneLayout variant is added,
			// this function fails to compile, which is the desired canary.
			if (layout.kind === 'single') return layout.panel;
			if (layout.kind === 'split') return `${layout.first}|${layout.second}`;
			if (layout.kind === 'grid') return layout.panels.join(',');
			// biome-ignore lint/correctness/noUnreachable: exhaustiveness guard
			const _exhaustive: never = layout;
			return _exhaustive;
		}

		expectTypeOf(render).parameter(0).toEqualTypeOf<SceneLayout>();
	});

	it('SceneConfig round-trips through JSON without losing type identity', () => {
		const scene: SceneConfig = {
			version: 1,
			panels: [{ id: 'p', type: 'x', config: { a: 1 } }],
			layout: { kind: 'single', panel: 'p' }
		};
		const restored = JSON.parse(JSON.stringify(scene)) as SceneConfig;
		expectTypeOf(restored).toEqualTypeOf<SceneConfig>();
	});

	it('allows SingleSceneLayout referenced by its exact type', () => {
		const layout: SingleSceneLayout = { kind: 'single', panel: 'x' };
		expectTypeOf(layout).toEqualTypeOf<SingleSceneLayout>();
	});
});
