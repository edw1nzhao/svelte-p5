import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createActionRegistry, type Action } from './action-registry.js';
import ActionsHarness from './tests/ActionsHarness.svelte';

const RECENT_KEY = 'palette-test-recent';

function makeActions() {
	const ran: string[] = [];
	let trails = true;
	const actions: Action[] = [
		{
			id: 'trails',
			label: 'Toggle Movement Trails',
			description: 'Show or hide movement paths',
			group: 'filter',
			keys: { key: 'm' },
			checked: () => trails,
			run: () => {
				trails = !trails;
				ran.push('trails');
			}
		},
		{
			id: 'stops',
			label: 'Toggle Stop Points',
			group: 'filter',
			keys: { key: 's' },
			checked: () => false,
			run: () => ran.push('stops')
		},
		{
			id: 'play',
			label: 'Play/Pause',
			group: 'playback',
			keys: { key: ' ' },
			icon: '⏯',
			run: () => ran.push('play')
		},
		{
			id: 'undo',
			label: 'Undo',
			group: 'history',
			keys: { key: 'z', mod: true },
			hidden: true,
			run: () => ran.push('undo')
		}
	];
	return { actions, ran };
}

function setup(props: { recentKey?: string } = {}) {
	const { actions, ran } = makeActions();
	const registry = createActionRegistry(actions, {
		mac: false,
		groupLabels: { filter: 'Filter', playback: 'Playback' }
	});
	const onRun = vi.fn();
	const user = userEvent.setup();
	render(ActionsHarness, { props: { registry, onRun, ...props } });
	return { ran, onRun, user };
}

const dialog = () => screen.queryByRole('dialog', { name: 'Command palette' });

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('<CommandPalette>', () => {
	it('opens with mod+K, focuses the search box, and toggles closed', async () => {
		const { user } = setup();
		expect(dialog()).toBeNull();
		await user.keyboard('{Control>}k{/Control}');
		const palette = dialog();
		expect(palette).not.toBeNull();
		expect(within(palette!).getByRole('combobox', { name: 'Search commands...' })).toHaveFocus();
		await user.keyboard('{Control>}k{/Control}');
		expect(dialog()).toBeNull();
	});

	it('lists visible actions grouped, with shortcut hints and toggle state', async () => {
		const { user } = setup();
		await user.keyboard('{Control>}k{/Control}');
		const list = within(dialog()!).getByRole('listbox');
		expect(within(list).getAllByRole('group')).toEqual([
			within(list).getByRole('group', { name: 'Filter' }),
			within(list).getByRole('group', { name: 'Playback' })
		]);
		expect(within(list).queryByRole('option', { name: /Undo/ })).toBeNull();
		const trails = within(list).getByRole('option', { name: /Toggle Movement Trails/ });
		expect(trails).toHaveTextContent('active');
		expect(within(trails).getByText('M', { selector: 'kbd' })).toBeInTheDocument();
		const stops = within(list).getByRole('option', { name: /Toggle Stop Points/ });
		expect(stops).not.toHaveTextContent('active');
		const play = within(list).getByRole('option', { name: /Play\/Pause/ });
		expect(within(play).getByText('Space', { selector: 'kbd' })).toBeInTheDocument();
	});

	it('filters as you type and marks the matched characters', async () => {
		const { user } = setup();
		await user.keyboard('{Control>}k{/Control}');
		await user.keyboard('stop');
		const options = within(dialog()!).getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Toggle Stop Points');
		const marks = [...options[0]!.querySelectorAll('mark')].map((m) => m.textContent);
		expect(marks.join('')).toBe('Stop');
	});

	it('says so when nothing matches', async () => {
		const { user } = setup();
		await user.keyboard('{Control>}k{/Control}');
		await user.keyboard('zzz');
		expect(within(dialog()!).queryAllByRole('option')).toHaveLength(0);
		expect(dialog()).toHaveTextContent('No commands found for "zzz"');
	});

	it('runs the selected action with arrows and Enter, calls onRun, and closes', async () => {
		const { user, ran, onRun } = setup();
		await user.keyboard('{Control>}k{/Control}');
		const input = within(dialog()!).getByRole('combobox');
		const first = within(dialog()!).getAllByRole('option')[0]!;
		expect(first).toHaveAttribute('aria-selected', 'true');
		expect(input).toHaveAttribute('aria-activedescendant', first.id);
		await user.keyboard('{ArrowDown}');
		const second = within(dialog()!).getAllByRole('option')[1]!;
		expect(second).toHaveTextContent('Toggle Stop Points');
		expect(second).toHaveAttribute('aria-selected', 'true');
		expect(input).toHaveAttribute('aria-activedescendant', second.id);
		await user.keyboard('{Enter}');
		expect(ran).toEqual(['stops']);
		expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ id: 'stops' }));
		expect(dialog()).toBeNull();
	});

	it('jumps with End and Home and clamps at the ends', async () => {
		const { user, ran } = setup();
		await user.keyboard('{Control>}k{/Control}');
		await user.keyboard('{End}{ArrowDown}{Enter}');
		expect(ran).toEqual(['play']);
		await user.keyboard('{Control>}k{/Control}');
		await user.keyboard('{ArrowDown}{Home}{ArrowUp}{Enter}');
		expect(ran).toEqual(['play', 'trails']);
	});

	it('runs an action on click', async () => {
		const { user, ran } = setup();
		await user.keyboard('{Control>}k{/Control}');
		await user.click(within(dialog()!).getByRole('option', { name: /Play\/Pause/ }));
		expect(ran).toEqual(['play']);
		expect(dialog()).toBeNull();
	});

	it('closes on Escape and returns focus to the element that had it', async () => {
		const { user, ran } = setup();
		const trigger = screen.getByRole('button', { name: 'Show shortcuts' });
		trigger.focus();
		await user.keyboard('{Control>}k{/Control}');
		expect(trigger).not.toHaveFocus();
		await user.keyboard('{Escape}');
		expect(dialog()).toBeNull();
		expect(trigger).toHaveFocus();
		expect(ran).toEqual([]);
	});

	it('closes on a backdrop click', async () => {
		const { user } = setup();
		await user.keyboard('{Control>}k{/Control}');
		const backdrop = document.querySelector('.command-palette__backdrop');
		expect(backdrop).not.toBeNull();
		await user.click(backdrop!);
		expect(dialog()).toBeNull();
	});

	it('shows recently run actions first when the query is empty', async () => {
		const { user } = setup({ recentKey: RECENT_KEY });
		await user.keyboard('{Control>}k{/Control}');
		expect(within(dialog()!).queryByRole('group', { name: 'Recent' })).toBeNull();
		await user.click(within(dialog()!).getByRole('option', { name: /Play\/Pause/ }));

		await user.keyboard('{Control>}k{/Control}');
		const recent = within(dialog()!).getByRole('group', { name: 'Recent' });
		expect(
			within(recent)
				.getAllByRole('option')
				.map((o) => o.textContent)
		).toEqual([expect.stringContaining('Play/Pause')]);
		expect(within(dialog()!).getAllByRole('group')[0]).toBe(recent);
		await user.keyboard('{Enter}');

		await user.keyboard('{Control>}k{/Control}');
		await user.keyboard('play');
		expect(within(dialog()!).queryByRole('group', { name: 'Recent' })).toBeNull();
	});
});
