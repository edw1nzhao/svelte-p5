# Performance benchmark

Compares two thin Svelte wrappers around the p5.js constructor:

1. **`svelte-p5`** (this repo) - calls `instance.remove()` on unmount.
2. **Legacy** - a port of [`p5-svelte`](https://github.com/tonyketcham/p5-svelte)'s
   `<P5>` component to Svelte 5 syntax ([`src/LegacyP5Canvas.svelte`](./src/LegacyP5Canvas.svelte)).
   The original is Svelte 3; porting it to Svelte 5 lets us compare the
   _wrappers_ in isolation rather than the framework versions.

Both run the same sketch under the same browser, same Vite build, same
Svelte runtime. Any measured difference is the wrapper.

## Tests

Two tests, each repeated **N=3** times by default for stable means:

| Test                   | What it measures                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Lifecycle stress**   | Mount/unmount the sketch 500 times. Count p5 instances created vs torn down + wall-clock elapsed.         |
| **Per-frame overhead** | One mounted sketch with 15,000 particles. Count draws/sec to confirm the wrapper adds zero hot-path cost. |

The lifecycle test is where the wrappers differ. The per-frame test confirms
that difference doesn't come at the cost of draw performance.

## Run it

```bash
pnpm install                                               # from repo root
pnpm --filter @svelte-p5/bench exec playwright install chromium
pnpm --filter @svelte-p5/bench bench
```

Knobs (env vars):

| Var               | Default | Meaning                                 |
| ----------------- | ------- | --------------------------------------- |
| `BENCH_RUNS`      | 3       | Independent runs per test (per harness) |
| `BENCH_TOGGLES`   | 500     | Mount/unmount cycles in the leak test   |
| `BENCH_PARTICLES` | 2000    | Particles in the FPS test               |
| `BENCH_FPS_MS`    | 5000    | FPS measurement window in milliseconds  |

Results print as a stdout table and write to `results.json`.

## Sample output

```
LIFECYCLE STRESS (500 toggle cycles)
  retained instances:  modern=0 (±0.00)
                       legacy=500 (±0.00)
  wall-clock time:     modern=4.16s (±0.00s)
                       legacy=37.64s (±0.08s)
                       legacy is 9.0× slower

PER-FRAME OVERHEAD (15000 particles, single mounted sketch)
  modern: mean=52.1 min=51.4 max=52.7 std=0.55
  legacy: mean=50.5 min=49.3 max=51.4 std=0.86
  wrapper adds zero hot-path overhead - both within measurement noise
```

Full writeup with explanation: [docs/perf-comparison.md](../docs/perf-comparison.md).
