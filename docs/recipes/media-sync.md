# Syncing a timeline to video

`createMediaSync` keeps a timeline's position in step with a playing video, and `createMediaPlayback` drives the video from the timeline. Both reach the video through a **port**, so the video does not have to be an HTML `<video>` element.

## The simple case needs no port

Pass the element. The library wraps it for you.

```svelte
<script>
	import { createMediaSync } from 'svelte-p5-components';

	let video;
	let currentTime = $state(0);
	let speed = $state(1);

	const sync = createMediaSync();
	$effect(() => sync.attach(video));

	// Your animation loop.
	$effect(() => {
		let raf;
		const tick = (now, last = now) => {
			if (sync.isLocked) currentTime = sync.mediaTime;
			else currentTime += (speed * (now - last)) / 1000;
			raf = requestAnimationFrame((t) => tick(t, now));
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<video bind:this={video} src="/clip.mp4" controls></video>
```

`isLocked` is the part worth understanding. While the video plays, it is the clock and your speed multiplier does nothing. Surface that (`<TimelineScrubber speedLocked />`) so the multiplier looks inactive rather than broken.

## When the video is not an element

A YouTube iframe player, a WebAudio graph, a remote transport driven over a socket: none of these are media elements. Write an adapter.

The port is small. `MediaSource` is everything `createMediaSync` reads; `MediaPort` adds `play` and `pause` for `createMediaPlayback`.

```ts
interface MediaSource {
	readonly currentTime: number;
	readonly duration: number;
	readonly paused: boolean;
	readonly ended: boolean;
	seek(time: number): void;
	subscribe?(onChange: () => void): () => void;
}
```

### A YouTube adapter

The iframe API reports state changes but never emits a continuous time event, so this adapter implements `subscribe` for state and lets the helper sample the clock.

```ts
import type { MediaPort } from 'svelte-p5-components';

const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;

export function youTubePort(player: YT.Player): MediaPort {
	let state = UNSTARTED;

	return {
		get currentTime() {
			return player.getCurrentTime?.() ?? 0;
		},
		get duration() {
			const d = player.getDuration?.() ?? 0;
			return isFinite(d) ? d : 0;
		},
		get paused() {
			return state !== PLAYING;
		},
		get ended() {
			return state === ENDED;
		},
		seek(time) {
			player.seekTo(time, true);
		},
		play() {
			player.playVideo();
		},
		pause() {
			player.pauseVideo();
		},
		subscribe(onChange) {
			const listener = (e: { data: number }) => {
				state = e.data;
				onChange();
			};
			player.addEventListener('onStateChange', listener);
			return () => player.removeEventListener('onStateChange', listener);
		}
	};
}
```

Attach it exactly like an element:

```ts
sync.attach(youTubePort(player));
```

### Omitting `subscribe`

`subscribe` is optional. A source that cannot report anything omits it, and the helper polls: an animation frame while playing, and a slower interval (250ms) while paused so a resume is still noticed.

Implement `subscribe` when you can. It removes the idle polling entirely.

## Why the helper owns the loop

A hand-rolled sync usually looks like this, and the bug is easy to miss:

```ts
function updateTime() {
	if (player && isPlaying) setCurrentTime(player.getCurrentTime());
	requestAnimationFrame(updateTime); // reschedules forever
}
```

The guard skips the work but not the scheduling, so the frame callback outlives playback and often the video itself. `createMediaSync` stops its loop when playback stops, which is the main reason to reach for it over writing the twenty lines yourself.

## Testing an adapter

Both helpers take an injectable scheduler, so a test can drive the loop without real frames:

```ts
const sync = createMediaSync({ scheduler: fakeScheduler });
```

A port is an ordinary object, so a fake source is a few getters and needs no DOM.
