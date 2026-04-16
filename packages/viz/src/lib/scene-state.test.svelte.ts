import { describe, it, expect } from 'vitest';
import { createSceneState } from './scene-state.svelte.js';

describe('createSceneState', () => {
	it('initializes hover as null and highlights as empty array', () => {
		const scene = createSceneState();
		expect(scene.hover).toBeNull();
		expect(scene.highlights).toEqual([]);
	});

	it('is mutable — chrome writes hover and highlights directly', () => {
		const scene = createSceneState();
		scene.hover = { id: 'alice' };
		scene.highlights = ['alice', 'bob'];

		expect(scene.hover).toEqual({ id: 'alice' });
		expect(scene.highlights).toEqual(['alice', 'bob']);
	});

	it('each call returns an independent store', () => {
		const a = createSceneState();
		const b = createSceneState();

		a.hover = { id: 'a' };

		expect(b.hover).toBeNull();
	});

	it('the returned object is mutable and mutations are visible to subsequent reads', () => {
		// This is the observable contract the chrome relies on — no need to
		// spin up an $effect root to verify it. The actual reactivity (i.e.
		// $derived picking up changes automatically) is exercised everywhere
		// scene-state is consumed in the chrome components.
		const scene = createSceneState();

		expect(scene.hover).toBeNull();
		scene.hover = { id: 'alice' };
		expect(scene.hover).toEqual({ id: 'alice' });

		scene.highlights = ['alice', 'bob'];
		expect(scene.highlights).toHaveLength(2);

		scene.hover = null;
		expect(scene.hover).toBeNull();
		// unrelated: highlights persist until chrome clears them
		expect(scene.highlights).toEqual(['alice', 'bob']);
	});
});
