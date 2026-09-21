import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import EntityToggleList, { type Entity } from './EntityToggleList.svelte';

// NOTE: Several structural assertions (counting `.entity-toggle-list__item`
// elements, clicking a label by its text) hit a happy-dom + Svelte 5
// runes interaction where entities inside a keyed `{#each}` over a
// $derived don't render under the test harness even though they render
// correctly in real browsers.
//
// This block previously claimed a Playwright smoke pass in `tests/examples/`
// covered that path end to end. No such suite exists; the only Playwright in
// this repo is in `bench/`. Per-entity rendering is therefore UNCOVERED, and
// saying so is more useful than a comment that makes the gap look handled.
//
// The tests below verify what happy-dom can reliably observe: the root
// element, the heading, the data attribute that reflects group presence,
// and the expander button that appears when maxVisible truncates.

describe('<EntityToggleList>', () => {
	it('mounts without throwing with an empty entities array', () => {
		const { container } = render(EntityToggleList, { props: { entities: [] } });
		expect(container.querySelector('.entity-toggle-list')).not.toBeNull();
	});

	it('renders a heading when provided', () => {
		const { container } = render(EntityToggleList, {
			props: { entities: [], heading: 'Speakers' }
		});
		expect(container.querySelector('.entity-toggle-list__heading')?.textContent).toBe('Speakers');
	});

	it('data-has-groups is false when no entity declares a group', () => {
		const entities: Entity[] = [
			{ id: 'a', label: 'A', color: '#000' },
			{ id: 'b', label: 'B', color: '#111' }
		];
		const { container } = render(EntityToggleList, { props: { entities } });
		expect(container.querySelector('.entity-toggle-list')?.getAttribute('data-has-groups')).toBe(
			'false'
		);
	});

	it('data-has-groups is true when any entity declares a group', () => {
		const entities: Entity[] = [
			{ id: 'a', label: 'A', color: '#000', group: 'G1' },
			{ id: 'b', label: 'B', color: '#111' }
		];
		const { container } = render(EntityToggleList, { props: { entities } });
		expect(container.querySelector('.entity-toggle-list')?.getAttribute('data-has-groups')).toBe(
			'true'
		);
	});

	it('group labels render for grouped entities in insertion order', () => {
		const entities: Entity[] = [
			{ id: '1', label: 'A1', color: '#000', group: 'A' },
			{ id: '2', label: 'B1', color: '#000', group: 'B' },
			{ id: '3', label: 'A2', color: '#000', group: 'A' }
		];
		const { container } = render(EntityToggleList, { props: { entities } });
		const labels = [...container.querySelectorAll('.entity-toggle-list__group-label')].map(
			(n) => n.textContent
		);
		expect(labels).toEqual(['A', 'B']);
	});

	it('renders a "+N more" expander when maxVisible truncates', () => {
		const entities: Entity[] = Array.from({ length: 10 }, (_, i) => ({
			id: `u${i}`,
			label: `U${i}`,
			color: '#000'
		}));
		const { container } = render(EntityToggleList, { props: { entities, maxVisible: 3 } });
		const expander = container.querySelector('.entity-toggle-list__expand');
		expect(expander?.textContent).toContain('+7 more');
	});

	it('omits the expander when no truncation is happening', () => {
		const entities: Entity[] = [
			{ id: 'a', label: 'A', color: '#000' },
			{ id: 'b', label: 'B', color: '#000' }
		];
		const { container } = render(EntityToggleList, { props: { entities, maxVisible: 5 } });
		expect(container.querySelector('.entity-toggle-list__expand')).toBeNull();
	});

	it('accepts a per-entity controls snippet without throwing', () => {
		// Per-entity output is not observable here (see the note above), so this
		// pins the contract: the prop is accepted and mounting stays clean.
		const controls = createRawSnippet((entity: () => Entity) => ({
			render: () => `<button data-testid="extra-${entity().id}">extra</button>`
		}));
		const entities: Entity[] = [{ id: 'a', label: 'A', color: '#f00' }];
		const { container } = render(EntityToggleList, { props: { entities, controls } });
		expect(container.querySelector('.entity-toggle-list')).not.toBeNull();
	});
});
