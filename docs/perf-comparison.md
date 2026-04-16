# Wrapper behavior comparison

This page documents the measurable difference between two thin Svelte wrappers
around p5.js: this library and the original
[`p5-svelte`](https://github.com/tonyketcham/p5-svelte). The bench is in
[`bench/`](../bench) and you can run it yourself.

The point isn't to argue one wrapper is "better." Both are short components
that work fine for most p5 apps. The point is to show what each one does
under specific conditions, so you can decide whether the difference matters
for what you're building.

## Whether this comparison matters for you

**Probably doesn't matter** if your app:

- Mounts a single sketch on a page and never unmounts it (most artwork,
  portfolio embeds, single-page tutorials, standalone canvas demos).
- Has at most a few route changes per session and the user doesn't come
  back to the same page repeatedly.

For those cases, both wrappers behave identically in practice and the choice
is about API ergonomics (Svelte 5 runes vs Svelte 3, bindable instance vs
event dispatcher) rather than performance.

**May matter** if your app:

- Uses `{#if showSketch}<P5Canvas />{/if}` toggles (dashboard panels,
  modals, conditional viz).
- Is a SvelteKit app where users navigate between pages with sketches.
- Uses HMR during development on a sketch-heavy page.

In those cases, every mount/unmount of the sketch matters, because the two
wrappers diverge there.

## What the wrappers actually do differently

Both construct a p5 instance in `onMount` and hand it back through a prop.
The only meaningful difference: svelte-p5 calls `instance.remove()` in its
cleanup function so each unmount tears the p5 instance down; the original
p5-svelte component leaves teardown to the consumer.

To compare the wrappers without confounding the result with the Svelte
runtime version, the bench ports the original p5-svelte component to Svelte 5
syntax verbatim
([`bench/src/LegacyP5Canvas.svelte`](../bench/src/LegacyP5Canvas.svelte))
and runs both under the same Svelte runtime, the same Vite build, and the
same browser.

## Methodology

Four tests, each repeated **N=3** times.

1. **Lifecycle stress** - mount/unmount the sketch 500 times, count p5
   instances created vs torn down, measure wall-clock time.
2. **Per-frame overhead** - one mounted sketch with 2,000 particles,
   measure draws per second.
3. **Foreground FPS under retained instances** - leak N instances first,
   then measure how many fps the foreground sketch keeps. Run for counts
   of 0, 10, 25, 50, 100.
4. **Scaling sweep** - lifecycle stress at multiple cycle counts (100,
   250, 500) to see how the cost grows.

The sketch is shared between both harnesses byte-for-byte
([`bench/src/sharedSketch.ts`](../bench/src/sharedSketch.ts)). Each test
runs in a fresh Chromium instance.

```bash
pnpm install
pnpm --filter @svelte-p5/bench exec playwright install chromium
pnpm --filter @svelte-p5/bench bench
```

Results print to stdout and write to `bench/results.json`.

## Results

**Environment**: Chromium 147, Linux x86_64, n=3 runs per test.

### What's the same

| Metric                                                    | svelte-p5  | p5-svelte (port) |
| --------------------------------------------------------- | ---------- | ---------------- |
| Per-frame draw cost (one mounted sketch, 2,000 particles) | 60 fps     | 60 fps           |
| API surface for the basic case                            | identical  | identical        |
| Bundle size impact                                        | negligible | negligible       |

Both wrappers feed the same sketch to the same `new p5()` constructor, so
once a sketch is mounted, the per-frame work is identical.

### What's different

After a sketch unmounts:

| Behavior                                         | svelte-p5 | p5-svelte (port) |
| ------------------------------------------------ | --------- | ---------------- |
| `instance.remove()` called                       | **yes**   | no               |
| p5 instance retained in memory                   | no        | yes              |
| Background `requestAnimationFrame` keeps running | no        | yes              |

This is the entire functional difference. Whether it shows up in your app
depends on whether you ever unmount sketches.

### Wall-clock cost of repeated mount/unmount

| Cycles | svelte-p5 | p5-svelte (port) |
| ------ | --------- | ---------------- |
| 100    | 0.83s     | 1.23s            |
| 250    | 2.08s     | 9.21s            |
| 500    | 4.17s     | 37.86s           |

For svelte-p5, time grows roughly linearly with cycle count. For the
legacy port, time grows super-linearly because each new cycle has to share
frames with every retained instance from prior cycles.

A typical user session might involve a few dozen mount/unmount cycles
(navigation, modals, etc.) - well below the 500 mark. Even at 100 cycles,
the absolute wall-clock difference is well under a second; for most apps
this is invisible.

### How retained instances affect the visible sketch

This is the test that's most directly user-facing. After cycling N times
to accumulate N retained instances on the legacy harness, measure how many
frames per second the currently-visible sketch achieves. (svelte-p5
doesn't retain instances, so its number is constant regardless of cycle
count.)

| Retained instances | svelte-p5 | p5-svelte (port) |
| ------------------ | --------- | ---------------- |
| 0                  | 60 fps    | 60 fps           |
| 10                 | 60 fps    | 60 fps           |
| 25                 | 60 fps    | 60 fps           |
| 50                 | 60 fps    | 44 fps           |
| 100                | 60 fps    | 22.5 fps         |

Up to 25 retained instances, both wrappers look identical. Past that, the
legacy wrapper's foreground sketch starts dropping frames because the
retained instances are still calling `requestAnimationFrame` and competing
for the frame budget.

Whether this matters depends on whether your app's usage pattern reaches
that range. A dashboard where users frequently toggle viz panels could; a
landing page with one fixed sketch never will.

### Lifecycle stress at 500 cycles

For completeness, the headline numbers from the lifecycle stress test:

- 500 cycles, both harnesses
- svelte-p5: 0 instances retained, 4.16s elapsed
- p5-svelte (port): 500 instances retained, 38.59s elapsed

500 cycles is well beyond any normal session. The number is useful as a
characterization of the asymptotic behavior (linear-leak signature), not
as a "this is what your app will experience" claim.

## What this benchmark does not measure

- **Initial mount time.** Both wrappers do the same dynamic `import('p5')`;
  difference is in microseconds.
- **Bundle size.** Both wrapper components are ~30 lines.
- **Heap usage.** `performance.memory.usedJSHeapSize` is quantized to
  ~1 MB by Chromium and reads identical for both runs at these sketch sizes.
- **HiDPI and resize.** That's the `<Sketch>` component's job, not
  `<P5Canvas>`.
- **API ergonomics.** A design conversation, not a benchmarkable one.

## Reproducibility

Re-running the bench may produce slightly different elapsed-time values
(±5%, depending on system load), but the **retained-instance count is
deterministic** and will always show 500 retained instances after 500
cycles on the legacy harness. If you find a methodology issue or get
materially different numbers,
[open an issue](https://github.com/edw1nzhao/svelte-p5/issues) with your
`results.json` and environment.

Numbers above were captured on **2026-04-16** with the bench at
[`bench/`](../bench).
