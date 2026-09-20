# Upgrading

What changed in each release, what you have to do about it, and how to get from any published version to the current one.

Current releases: **`svelte-p5` 0.4.0**, **`svelte-p5-components` 0.7.0**, **`svelte-p5-viz` 0.2.2**.

## The rule that catches everyone

While a package is below `1.0.0`, a caret range pins the **minor**, not the major:

| your range | actually allows  | does it get 0.7.0? |
| ---------- | ---------------- | ------------------ |
| `^0.5.0`   | `>=0.5.0 <0.6.0` | no                 |
| `^0.6.0`   | `>=0.6.0 <0.7.0` | no                 |
| `~0.7.0`   | `>=0.7.0 <0.8.0` | yes, patches only  |

This is correct npm behaviour, not a bug, and it is why an app can sit four releases behind without a single warning. `npm outdated` and `pnpm outdated` will tell you; `npm update` will not move you.

**Every minor release of a 0.x package needs an explicit bump in your `package.json`.** Until a package reaches 1.0.0, check this page rather than relying on your package manager.

`svelte-p5` and `svelte-p5-components` reach 1.0.0 in the next release, which ends this for both of them. `svelte-p5-viz` stays on 0.x, so the rule still applies there.

## 1.0.0

`svelte-p5` and `svelte-p5-components` move to 1.0.0 together. Nothing in their APIs changes; the version number is the change, and what it buys you is a promise:

- Inside a major, minor and patch releases never break a documented API, so `^1.0.0` is safe to leave in place and `pnpm update` picks up fixes on its own.
- Breaking changes need a major, announced here with a migration path.

**Action: none beyond the version bump.**

```sh
pnpm add svelte-p5@^1.0.0 svelte-p5-components@^1.0.0
```

If you are coming from `svelte-p5-components` 0.5.0 or earlier, read the 0.5.0 and 0.6.0 notes below first. Those still apply; 1.0.0 does not absorb them.

### Why `svelte-p5-viz` stays on 0.x

Its panel contract, registry and scene format have never been exercised by a consumer. The only thing any application has ever imported from it is the `Bounds` type. Declaring a stable API for a design nobody has built against would be a promise made on no evidence, so it stays on 0.x and keeps the right to break in a minor. Pin an exact version if you depend on it.

### What counts as public API

Everything exported from a package root. Not: deep import paths, component internals, class names, or DOM structure. Style through documented props and CSS custom properties rather than by reaching into the markup, or a patch release can still break you without violating semver.

### The next major

p5 2.x makes `setup` async and reworks the WEBGL renderer, neither of which the current ready-time sizing survives. Support for it lands as 2.0.0 whenever it lands. The peer range stays `>=1.11.0 <3` until then, so you will not be moved onto p5 2.x by accident.

## Compatibility

`svelte-p5-components` and `svelte-p5-viz` both declare `svelte-p5` as a **peer** dependency, so you install it yourself and your package manager will not pick it for you.

| components    | viz           | requires `svelte-p5`              | p5            | svelte |
| ------------- | ------------- | --------------------------------- | ------------- | ------ |
| 0.7.0         | 0.2.2         | `>=0.4.0 <1`                      | `>=1.11.0 <3` | `^5`   |
| 0.6.0         | -             | `>=0.4.0` (no ceiling, see below) | `>=1.11.0 <3` | `^5`   |
| 0.1.0 - 0.5.0 | 0.2.0 - 0.2.1 | **broken**, see below             | `>=1.11.0 <3` | `^5`   |

## Known-bad published versions

**`svelte-p5-components` 0.1.0 through 0.5.0, and `svelte-p5-viz` 0.2.0 and 0.2.1**, were published with `"svelte-p5": "workspace:^"` in `peerDependencies`. `workspace:` is a pnpm-internal protocol that `pnpm pack` rewrites in `dependencies` but not in `peerDependencies`, so it reached the registry, where it does not resolve. Yarn 4 fails hardest, crashing during post-resolution validation.

If you are on any of these, upgrade. There is no workaround short of overriding the peer yourself.

**`svelte-p5-components` 0.6.0** declares `"svelte-p5": ">=0.4.0"` with no upper bound, so it claims compatibility with every future major. Harmless today because no `svelte-p5` 1.x exists, and fixed in 0.7.0.

## Upgrade notes by version

Newest first. "Action" is what you have to do; anything marked **breaking** needs a code change.

### `svelte-p5-components` 0.7.0 — 2026-09-20

The media helpers take a port instead of binding to `HTMLMediaElement`.

- `createMediaSync` and `createMediaPlayback` now accept an `HTMLMediaElement` **or** a `MediaSource`/`MediaPort` object.
- New exports: `htmlMediaPort`, `createPoller`, `IDLE_POLL_MS`, and the `MediaSource`, `MediaPort`, `TickerScheduler` types.
- Both helpers take an optional options argument carrying an injectable scheduler, for tests.
- The peer range on `svelte-p5` regained its `<1` ceiling.

**Action: none.** Passing an element still works and is still the documented default. Adopt a port only when your video is not a media element, for example a YouTube iframe player. See [Syncing a timeline to video](recipes/media-sync.md).

### `svelte-p5-viz` 0.2.2 — 2026-09-20

**Action: upgrade if you are on 0.2.0 or 0.2.1.** Those are the broken-peer builds described above. No API change.

### `svelte-p5-components` 0.6.0 — 2026-07-21

- `Sketch` gained an `onResize` callback and explicit pixel-density control via `hidpi`, which accepts a boolean or a number. `hidpi={false}` was a no-op before this release.
- `@neodrag/core` became a direct dependency rather than being relied on transitively.

**Action:** if you drive canvas resizing yourself, prefer `onResize` and delete your own `ResizeObserver` and any p5-native `windowResized`. Running both is the common failure: two resize drivers race and the canvas flickers or lands at the wrong size. If you previously passed `hidpi={false}` expecting it to do something, it does now.

### `svelte-p5` 0.4.0 — 2026-07-21

Adds the generic `SketchFn<Ext>` and `ExtendedP5<Ext>` for typing your own additions to the p5 instance.

**Action: none.** `SketchFn` without a type argument behaves as before.

### `svelte-p5-components` 0.5.0 — 2026-06-09

**Breaking: the timeline selection model changed**, alongside a YouTube-style scrubber. Also adds `ActivityBar`, `SidePanel` and `ContextMenu` primitives, `createMediaPlayback`, a `playheadFollowsSelectionStart` option, and inline rename on `EntityToggleList`.

**Action:** if you use `TimelineTrack` or `TimelineScrubber`, re-read their props before upgrading. This is the only breaking change in the library's history to date.

### `svelte-p5-components` 0.4.1 — 2026-04-17

`DraggableWindow` clamps to its parent on resize.

**Action: none.**

### `svelte-p5-components` 0.4.0 — 2026-04-16

Adds `CanvasFrame`, `EntityToggleList`, `HoverTooltip`, `SplitPane`, `TimelineTrack`, `TimelineScrubber` and `createMediaSync`.

**Action: none.** All additive.

### `svelte-p5-viz` 0.2.0 — 2026-04-16

First real release: the panel contract and scene format.

### `svelte-p5` 0.2.x and 0.3.0, components 0.1.0 - 0.3.0 — 2026-04

Early releases. 0.2.1 excluded test files from the published tarball; 0.2.2 corrected the repository URL. Nothing here is worth staying on.

## Getting from where you are to current

There are no required intermediate versions. Unlike a stateful server, a library has no migrations to step through, so you can jump straight to the current release from any earlier one. What you do need is to read every **breaking** and **action** note between your version and the target, because they compound.

### From components 0.1.0 - 0.4.1

```sh
pnpm add svelte-p5@^0.4.0 svelte-p5-components@^0.7.0
```

Read the 0.5.0 note: the timeline selection model changed and it is the one breaking change you will cross. Then the 0.6.0 note if you do your own resize handling.

### From components 0.5.0

```sh
pnpm add svelte-p5@^0.4.0 svelte-p5-components@^0.7.0
```

No breaking changes ahead of you. Read the 0.6.0 resize note. You are also leaving a broken-peer build, which may resolve your install errors on its own.

### From components 0.6.0

```sh
pnpm add svelte-p5-components@^0.7.0
```

Nothing to change. `svelte-p5` 0.4.0 already satisfies the new peer range.

### From viz 0.2.0 or 0.2.1

```sh
pnpm add svelte-p5-viz@^0.2.2
```

No API change; you are only leaving the broken peer range.

## Checking what you are on

```sh
pnpm ls svelte-p5 svelte-p5-components svelte-p5-viz
pnpm outdated
```

If `pnpm ls` reports an unmet peer for `svelte-p5`, you are on one of the broken-peer versions listed above.
