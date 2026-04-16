<script lang="ts">
	import { MessageSquare, X, Bug, Lightbulb, ExternalLink, Check } from '@lucide/svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const REPO = 'edw1nzhao/svelte-p5';

	let dialogEl: HTMLDialogElement | null = $state(null);
	let kind: 'bug' | 'feature' = $state('bug');
	let summary = $state('');
	let details = $state('');
	let userAgent = $state('');
	let pageUrl = $state('');
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		userAgent = navigator.userAgent;
	});

	$effect(() => {
		if (mounted) pageUrl = page.url.href;
	});

	function open() {
		summary = '';
		details = '';
		dialogEl?.showModal();
	}

	function close() {
		dialogEl?.close();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) close();
	}

	let issueUrl = $derived.by(() => {
		const isBug = kind === 'bug';
		const labels = isBug ? 'bug,from-site' : 'enhancement,from-site';
		const title = summary
			? `${isBug ? '[Bug]' : '[Feature]'} ${summary}`
			: isBug
				? '[Bug] '
				: '[Feature] ';

		const body = isBug
			? [
					'### What happened',
					details || '<!-- describe the bug -->',
					'',
					'### Expected behavior',
					'<!-- what you expected -->',
					'',
					'### Reproduction',
					'<!-- minimal repro: code, link, or steps -->',
					'',
					'---',
					'',
					'**Source page**: ' + pageUrl,
					'**Browser**: `' + userAgent + '`'
				].join('\n')
			: [
					'### Proposal',
					details || '<!-- what should we add or change -->',
					'',
					'### Why',
					'<!-- the problem this solves -->',
					'',
					'---',
					'',
					'**Source page**: ' + pageUrl
				].join('\n');

		const params = new URLSearchParams({ title, body, labels });
		return `https://github.com/${REPO}/issues/new?${params.toString()}`;
	});
</script>

<!-- Floating action button -->
<button
	type="button"
	onclick={open}
	class="fixed z-30 bottom-4 right-4 inline-flex items-center justify-center gap-2 h-12 sm:h-12 px-4 sm:px-5 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors min-w-12 font-medium text-sm"
	style="bottom: max(1rem, env(safe-area-inset-bottom)); right: max(1rem, env(safe-area-inset-right));"
	aria-label="Send feedback"
>
	<MessageSquare class="size-5" />
	<span class="hidden sm:inline">Feedback</span>
</button>

<dialog bind:this={dialogEl} onclick={onBackdropClick} class="sheet" aria-labelledby="fb-title">
	<div
		class="bg-white text-slate-900 sm:max-w-md sm:w-[28rem] sm:rounded-2xl sm:m-4 overflow-hidden shadow-2xl"
		style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
	>
		<div
			class="flex items-center justify-between px-5 py-4 border-b border-slate-100"
			style="padding-top: max(1rem, env(safe-area-inset-top));"
		>
			<h2 id="fb-title" class="text-base font-semibold text-slate-900">Send feedback</h2>
			<button
				type="button"
				onclick={close}
				class="inline-flex items-center justify-center size-10 rounded-md text-slate-500 hover:bg-slate-100"
				aria-label="Close"
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="p-5 flex flex-col gap-4">
			<!-- Kind toggle -->
			<div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg" role="radiogroup">
				<button
					type="button"
					role="radio"
					aria-checked={kind === 'bug'}
					onclick={() => (kind = 'bug')}
					class="flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors"
					class:bg-white={kind === 'bug'}
					class:text-slate-900={kind === 'bug'}
					class:shadow-sm={kind === 'bug'}
					class:text-slate-500={kind !== 'bug'}
				>
					<Bug class="size-4" />
					Bug
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={kind === 'feature'}
					onclick={() => (kind = 'feature')}
					class="flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors"
					class:bg-white={kind === 'feature'}
					class:text-slate-900={kind === 'feature'}
					class:shadow-sm={kind === 'feature'}
					class:text-slate-500={kind !== 'feature'}
				>
					<Lightbulb class="size-4" />
					Feature
				</button>
			</div>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-slate-700">Summary</span>
				<input
					type="text"
					bind:value={summary}
					placeholder={kind === 'bug' ? 'What broke?' : 'What should we add?'}
					class="h-11 px-3 rounded-md border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-slate-700">Details</span>
				<textarea
					bind:value={details}
					rows="4"
					placeholder={kind === 'bug'
						? 'Steps to reproduce, expected vs actual…'
						: 'Describe the use case…'}
					class="px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white resize-y"
				></textarea>
			</label>

			<div class="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-md p-3">
				<Check class="size-4 text-slate-400 shrink-0 mt-0.5" />
				<span>
					Opens a pre-filled GitHub issue with the page URL and your browser. You'll review before
					submitting.
				</span>
			</div>

			<a
				href={issueUrl}
				target="_blank"
				rel="noopener noreferrer"
				onclick={close}
				class="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors no-underline"
			>
				Continue on GitHub
				<ExternalLink class="size-4" />
			</a>
		</div>
	</div>
</dialog>
