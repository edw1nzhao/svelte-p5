<!-- GENERATED FILE. Do not edit by hand.
     Run `pnpm docs:upgrade` to regenerate.
     Mechanical data comes from the npm registry; prose lives in docs/upgrade-notes.json. -->

# Upgrading

What changed in each release, what you have to do about it, and how to get from any published version to the current one.

Current releases: **`svelte-p5` 1.0.0**, **`svelte-p5-components` 1.0.0**, **`svelte-p5-viz` 0.2.3**.

## The rule that catches everyone

`svelte-p5-viz` is still below `1.0.0`, and a caret range on a `0.x` package pins the **minor**, not the major:

| your range | actually allows  | gets the next minor? |
| ---------- | ---------------- | -------------------- |
| `^0.2.0`   | `>=0.2.0 <0.3.0` | no                   |
| `~0.2.0`   | `>=0.2.0 <0.3.0` | patches only         |

This is correct npm behaviour, not a bug, and it is why an app can sit several releases behind without a single warning. `npm outdated` and `pnpm outdated` will tell you; `npm update` will not move you.

**Every minor release of a 0.x package needs an explicit bump in your `package.json`.**

`svelte-p5` and `svelte-p5-components` are at 1.0.0 or above, where a caret range does what you expect and can be left in place.

## Compatibility

`svelte-p5-components` and `svelte-p5-viz` declare `svelte-p5` as a **peer** dependency, so you install it yourself and your package manager will not pick it for you.

| package                | version | requires `svelte-p5` | p5            | svelte   |
| ---------------------- | ------- | -------------------- | ------------- | -------- |
| `svelte-p5-components` | 1.0.0   | `^1.0.0`             | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.7.0   | `>=0.4.0 <1`         | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.6.0   | `>=0.4.0`            | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.5.0   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.4.1   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.4.0   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.3.0   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.2.1   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-components` | 0.1.0   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-viz`        | 0.2.3   | `>=0.4.0 <2`         | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-viz`        | 0.2.2   | `>=0.4.0 <1`         | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-viz`        | 0.2.1   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |
| `svelte-p5-viz`        | 0.2.0   | **broken**           | `>=1.11.0 <3` | `^5.0.0` |

## Known-bad published versions

### Unresolvable peer range

`svelte-p5-components@0.1.0`, `svelte-p5-components@0.2.1`, `svelte-p5-components@0.3.0`, `svelte-p5-components@0.4.0`, `svelte-p5-components@0.4.1`, `svelte-p5-components@0.5.0`, `svelte-p5-viz@0.2.0`, `svelte-p5-viz@0.2.1`

These were published with `"svelte-p5": "workspace:^"` in `peerDependencies`. `workspace:` is a pnpm-internal protocol that `pnpm pack` rewrites in `dependencies` but not in `peerDependencies`, so it reached the registry, where it does not resolve. Yarn 4 fails hardest, crashing during post-resolution validation.

If you are on any of these, upgrade. There is no workaround short of overriding the peer yourself.

### Peer range with no upper bound

`svelte-p5-components@0.6.0`

These declare a `svelte-p5` peer with no ceiling, so they claim compatibility with every future major. Harmless while no incompatible major exists, and worth upgrading away from.

## Upgrade notes by version

Newest first. **Action** is what you have to do; anything marked **Breaking** needs a code change.

### `svelte-p5` 1.0.0 — 2026-09-20

Declares a stable public API. No code change.

**Action:** Update the range to `^1.0.0`. The public API is `P5Canvas`, `createP5Bridge`, the exported types, and everything under `utils`. Deep import paths are internal and may still change in a minor.

### `svelte-p5-components` 1.0.0 — 2026-09-20

Declares a stable public API. No code change.

**Action:** Update the range to `^1.0.0`. From here a caret range behaves the way you expect: minor and patch releases never break a documented API, so you can leave it in place. If you are coming from 0.5.0 or earlier, the 0.5.0 and 0.6.0 notes below still apply.

### `svelte-p5-components` 0.7.0 — 2026-09-20

The media helpers take a port instead of binding to `HTMLMediaElement`. `createMediaSync` and `createMediaPlayback` now accept an element **or** a `MediaSource`/`MediaPort`. Adds `htmlMediaPort`, `createPoller`, `IDLE_POLL_MS` and the `MediaSource`, `MediaPort`, `TickerScheduler` types. Both helpers take an optional options argument carrying an injectable scheduler, for tests.

**Action:** None. Passing an element still works and is still the documented default. Adopt a port only when your video is not a media element, for example a YouTube iframe player. See [Syncing a timeline to video](recipes/media-sync.md).

### `svelte-p5-viz` 0.2.3 — 2026-09-20

Widens the `svelte-p5` peer to `>=0.4.0 <2` so it admits the 1.0 core. No API change.

**Action:** None. This package stays on 0.x deliberately; see its README for why.

### `svelte-p5-viz` 0.2.2 — 2026-09-20

Fixes the unresolvable `workspace:^` peer range. No API change.

**Action:** Upgrade if you are on 0.2.0 or 0.2.1.

### `svelte-p5-components` 0.6.0 — 2026-07-21

`Sketch` gained an `onResize` callback and explicit pixel-density control via `hidpi`, which accepts a boolean or a number. `hidpi={false}` was a no-op before this release. `@neodrag/core` became a direct dependency rather than being relied on transitively.

**Action:** If you drive canvas resizing yourself, prefer `onResize` and delete your own `ResizeObserver` and any p5-native `windowResized`. Running both is the common failure: two resize drivers race and the canvas flickers or lands at the wrong size. If you previously passed `hidpi={false}` expecting it to do something, it does now.

### `svelte-p5` 0.4.0 — 2026-07-21

Adds the generic `SketchFn<Ext>` and `ExtendedP5<Ext>` for typing your own additions to the p5 instance.

**Action:** None. `SketchFn` without a type argument behaves as before.

### `svelte-p5-viz` 0.2.1 — 2026-07-21

No consumer-facing change. Carries the unresolvable peer range described above.

### `svelte-p5-components` 0.5.0 — 2026-06-11

**Breaking.** The timeline selection model changed, alongside a YouTube-style scrubber. Also adds `ActivityBar`, `SidePanel` and `ContextMenu` primitives, `createMediaPlayback`, a `playheadFollowsSelectionStart` option, and inline rename on `EntityToggleList`.

**Action:** If you use `TimelineTrack` or `TimelineScrubber`, re-read their props before upgrading. This is the only breaking change in the library's history to date.

### `svelte-p5-components` 0.4.1 — 2026-04-17

`DraggableWindow` clamps to its parent on resize.

**Action:** None.

### `svelte-p5-components` 0.4.0 — 2026-04-16

Adds `CanvasFrame`, `EntityToggleList`, `HoverTooltip`, `SplitPane`, `TimelineTrack`, `TimelineScrubber` and `createMediaSync`.

**Action:** None. All additive.

### `svelte-p5` 0.3.0 — 2026-04-16

No consumer-facing change.

### `svelte-p5-components` 0.3.0 — 2026-04-16

No consumer-facing change. Carries the unresolvable peer range described above.

### `svelte-p5` 0.2.2 — 2026-04-16

No consumer-facing change.

### `svelte-p5-components` 0.2.1 — 2026-04-16

No consumer-facing change. Carries the unresolvable peer range described above.

### `svelte-p5` 0.2.0 — 2026-04-16

No consumer-facing change.

### `svelte-p5-viz` 0.2.0 — 2026-04-16

First real release: the panel contract and scene format.

**Action:** None.

### `svelte-p5-components` 0.1.0 — 2026-04-16

No consumer-facing change. Carries the unresolvable peer range described above.

## Getting from where you are to current

There are no required intermediate versions. Unlike a stateful server, a library has no migrations to step through, so you can jump straight to the current release from any earlier one. What you do need is to read every **Breaking** and **Action** note between your version and the target, because they compound.

```sh
pnpm add svelte-p5@^1.0.0 svelte-p5-components@^1.0.0 svelte-p5-viz@^0.2.3
```

## Checking what you are on

```sh
pnpm ls svelte-p5 svelte-p5-components svelte-p5-viz
pnpm outdated
```

If `pnpm ls` reports an unmet peer for `svelte-p5`, you are on one of the broken-peer versions listed above.
