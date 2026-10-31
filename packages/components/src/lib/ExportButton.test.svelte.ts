import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ExportButton from './ExportButton.svelte';

const download = vi.hoisted(() => vi.fn(async () => new Blob(['x'], { type: 'image/png' })));
vi.mock('svelte-p5', async (original) => ({
	...(await original<typeof import('svelte-p5')>()),
	downloadCanvas: download
}));

const instance = {} as import('p5').default;

afterEach(cleanup);

describe('<ExportButton>', () => {
	it('is disabled without an instance', () => {
		const { getByRole } = render(ExportButton, {});
		expect(getByRole('button')).toBeDisabled();
	});

	it('downloads with its options even without an onExport callback', async () => {
		download.mockClear();
		const { getByRole } = render(ExportButton, { instance, options: { scale: 2, format: 'jpeg' } });
		expect(getByRole('button')).toHaveTextContent('Export JPEG');
		await fireEvent.click(getByRole('button'));
		expect(download).toHaveBeenCalledWith(instance, { scale: 2, format: 'jpeg' });
	});

	it('reports the blob and routes errors to onError', async () => {
		const onExport = vi.fn();
		const onError = vi.fn();
		const { getByRole } = render(ExportButton, { instance, onExport, onError });
		await fireEvent.click(getByRole('button'));
		await vi.waitFor(() => expect(onExport).toHaveBeenCalledWith(expect.any(Blob)));
		download.mockRejectedValueOnce(new Error('too large'));
		await fireEvent.click(getByRole('button'));
		await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('too large')));
	});
});
