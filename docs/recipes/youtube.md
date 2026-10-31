# Syncing a timeline to YouTube

`svelte-p5-components/youtube` adapts a YouTube IFrame player to the [media port](./media-sync.md), so `createMediaSync` and `createMediaPlayback` drive it exactly as they drive a `<video>` element. It lives in its own subpath: the main entry stays free of YouTube code, and you only pay for it when you import it.

You bring the player. The adapter accepts anything shaped like `YT.Player`, including one typed with `@types/youtube`. The package does not depend on those types.

## Create a player and attach it

`createYouTubePlayer` loads the IFrame API once, creates a player, and resolves when the player is ready. A player's methods do not exist until then, which is the usual source of `getCurrentTime is not a function`.

```svelte
<script lang="ts">
	import { createMediaSync } from 'svelte-p5-components';
	import { createYouTubePlayer, youTubePort } from 'svelte-p5-components/youtube';

	let { videoId }: { videoId: string } = $props();
	let host = $state<HTMLDivElement>();

	const sync = createMediaSync();

	$effect(() => {
		if (!host) return;
		const el = host;
		// The API replaces its target with an iframe, so give it a child to replace.
		const target = document.createElement('div');
		el.replaceChildren(target);
		let cancelled = false;
		let destroy = () => {};

		createYouTubePlayer(target, {
			videoId,
			playerVars: { controls: 0, playsinline: 1, rel: 0 }
		})
			.then((player) => {
				destroy = () => player.destroy();
				if (cancelled) return destroy();
				sync.attach(youTubePort(player));
			})
			.catch((err) => console.error(err));

		return () => {
			cancelled = true;
			sync.detach();
			destroy();
			el.replaceChildren();
		};
	});
</script>

<div bind:this={host}></div><p>{sync.mediaTime.toFixed(1)}s of {sync.mediaDuration.toFixed(0)}s</p>
```

From here everything in [Syncing a timeline to video](./media-sync.md) applies unchanged: read `sync.isLocked` and `sync.mediaTime` in your animation loop, and call `sync.seek(t)` when the user scrubs.

## Playback verbs

`createMediaPlayback` works the same way:

```ts
import { createMediaPlayback } from 'svelte-p5-components';
import { youTubePort, type YouTubePlayerLike } from 'svelte-p5-components/youtube';

export function attachPlayback(player: YouTubePlayerLike) {
	const playback = createMediaPlayback();
	playback.attach(youTubePort(player));
	playback.playSnippets([12, 48, 95], 3);
	return playback;
}
```

## What the adapter handles

| YouTube behaviour                                                                          | What the port does                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Methods only exist after `onReady`, and calls throw once the iframe is gone                | Every read returns a neutral value (0, paused) and every command is a no-op until `port.ready` is true. Thrown errors are swallowed.                                                                                      |
| No `timeupdate` event                                                                      | `subscribe` reports state changes; the helper samples the clock each frame while playing and stops when playback stops.                                                                                                   |
| `seekTo` is asynchronous, so `getCurrentTime()` reports the old position briefly           | After `seek(t)` the port reports `t` until the player gets within `seekTolerance` (1s) of it, or `seekTimeoutMs` (1000ms) passes. Without this, `playSnippets` can skip a clip that starts before the previous one ended. |
| `seekTo` starts playback when called from any state except paused (unstarted, cued, ended) | A seek made while you are not playing pauses that unintended start.                                                                                                                                                       |
| `BUFFERING` mid-playback                                                                   | Counts as playing, so `isLocked` and `isPlaying` do not flicker and your timeline does not run ahead on its own clock.                                                                                                    |
| Speed and mute are not part of the port                                                    | `port.setPlaybackRate(rate)` and `port.setMuted(muted)`, with the same readiness guard.                                                                                                                                   |

Seeks are forwarded as they arrive, with `allowSeekAhead` set. If you seek on every pointer move while scrubbing, consider seeking on release instead.

## Bring your own player

You do not have to use `createYouTubePlayer`. If you already create players yourself, wrap one inside its `onReady`:

```ts
import { youTubePort, loadYouTubeIframeApi } from 'svelte-p5-components/youtube';
import type { MediaSync } from 'svelte-p5-components';

export async function mount(el: HTMLElement, videoId: string, sync: MediaSync) {
	const YT = await loadYouTubeIframeApi();
	new YT.Player(el, {
		videoId,
		events: { onReady: (e) => sync.attach(youTubePort(e.target)) }
	});
}
```

`loadYouTubeIframeApi` is safe to call from many components; it injects the script once, keeps any existing `window.onYouTubeIframeAPIReady`, and rejects rather than throwing during server rendering. Call it from `onMount` or an `$effect`, never at module scope in a SvelteKit page.

## Options

```ts
import { youTubePort, type YouTubePlayerLike } from 'svelte-p5-components/youtube';

export const portFor = (player: YouTubePlayerLike) =>
	youTubePort(player, {
		seekTolerance: 0.5, // seconds
		seekTimeoutMs: 2000
	});
```

Raise `seekTimeoutMs` for slow networks, where a seek into unbuffered video can take longer than a second to land.
