import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, type Snippet } from 'svelte';
import { createActionRegistry, type Action, type ActionSection } from './action-registry.js';
import ActionsHarness from './tests/ActionsHarness.svelte';

const noop = () => {};
const actions: Action[] = [
	{ id: 'play', label: 'Play/Pause', group: 'playback', keys: { key: ' ' }, run: noop },
	{
		id: 'speed-up',
		label: 'Speed Up',
		group: 'playback',
		keys: [{ key: '=' }, { key: '+' }],
		run: noop
	},
	{
		id: 'undo',
		label: 'Undo',
		group: 'history',
		keys: { key: 'z', mod: true },
		hidden: true,
		run: noop
	},
	{ id: 'example', label: 'Load: Example', group: 'examples', run: noop },
	{ id: 'trails', label: 'Toggle Movement Trails', group: 'filter', keys: { key: 'm' }, run: noop },
	{ id: 'clear', label: 'Clear All', group: 'clear', keys: { key: 'x', alt: true }, run: noop }
];

const sections: ActionSection[] = [
	{ id: 'playback', label: 'Playback' },
	{ id: 'navigation', label: 'Navigation', groups: ['history', 'examples'] },
	{ id: 'data', label: 'Data', groups: ['filter', 'clear'] }
];

async function openSheet(mac = false, footer?: Snippet) {
	const registry = createActionRegistry(actions, { mac });
	const user = userEvent.setup();
	render(ActionsHarness, { props: { registry, sections, footer } });
	const trigger = screen.getByRole('button', { name: 'Show shortcuts' });
	await user.click(trigger);
	return { user, trigger, sheet: screen.getByRole('dialog', { name: 'Keyboard Shortcuts' }) };
}

afterEach(() => cleanup());

const sheetQuery = () => screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' });

describe('<ShortcutCheatsheet>', () => {
	it('lists sections in order under their headings', async () => {
		const { sheet } = await openSheet();
		expect(within(sheet).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Keyboard Shortcuts'
		);
		expect(
			within(sheet)
				.getAllByRole('heading', { level: 3 })
				.map((h) => h.textContent)
		).toEqual(['Playback', 'Navigation', 'Data']);
		const data = within(sheet).getByRole('region', { name: 'Data' });
		expect(
			within(data)
				.getAllByRole('listitem')
				.map((li) => li.textContent?.replace(/\s+/g, ' ').trim())
		).toEqual(['Toggle Movement Trails M', 'Clear All Alt+X']);
	});

	it('lists each shortcut action once with all its keys, hidden ones included', async () => {
		const { sheet } = await openSheet();
		const speed = within(sheet).getByText('Speed Up').closest('li');
		expect(speed).not.toBeNull();
		expect(
			within(speed!)
				.getAllByText(/./, { selector: 'kbd' })
				.map((k) => k.textContent)
		).toEqual(['=', '+']);
		expect(within(sheet).getAllByText('Speed Up')).toHaveLength(1);
		expect(within(sheet).getByText('Undo').closest('li')).toHaveTextContent('Ctrl+Z');
		expect(within(sheet).queryByText('Load: Example')).toBeNull();
	});

	it('shows mod as Cmd on macOS', async () => {
		const { sheet } = await openSheet(true);
		expect(within(sheet).getByText('Undo').closest('li')).toHaveTextContent('⌘Z');
	});

	it('moves focus in on open and back to the trigger on Escape', async () => {
		const { user, sheet, trigger } = await openSheet();
		expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(sheetQuery()).toBeNull();
		expect(trigger).toHaveFocus();
	});

	it('closes from the close button and from the backdrop', async () => {
		const { user, sheet, trigger } = await openSheet();
		await user.click(within(sheet).getByRole('button', { name: 'Close' }));
		expect(sheetQuery()).toBeNull();
		await user.click(trigger);
		expect(sheetQuery()).not.toBeNull();
		await user.click(document.querySelector('.shortcut-cheatsheet__backdrop')!);
		expect(sheetQuery()).toBeNull();
	});

	it('renders the footer snippet in normal flow with its spaces and a key chip', async () => {
		const footer = createRawSnippet(() => ({
			render: () => '<span>Press <kbd>?</kbd> anytime to show this dialog</span>'
		}));
		const { sheet } = await openSheet(false, footer);
		const el = sheet.querySelector('.shortcut-cheatsheet__footer');
		expect(el?.textContent).toBe('Press ? anytime to show this dialog');
		expect(within(sheet).getByText('?', { selector: 'kbd' })).toBeInTheDocument();
	});
});
