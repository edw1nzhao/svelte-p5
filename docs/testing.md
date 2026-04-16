# Testing

## Stack

- **Vitest** for unit and component tests. Same runner across all packages.
- **happy-dom** for the DOM environment in the `components` package. Fast, no browser binaries, good enough for every Tier S chrome component in this repo (all HTML-based, none draw directly into a canvas).
- **@testing-library/svelte** for mounting Svelte 5 components and asserting against the rendered DOM.
- **@testing-library/user-event** for high-level interaction simulation.
- **Playwright** (planned) for end-to-end smoke tests against `docs/examples/*` — verifies the full p5 render path in a real browser.

## Running tests

```bash
# All packages
pnpm test

# Single package
pnpm --filter svelte-p5-components test
pnpm --filter svelte-p5-viz test
pnpm --filter svelte-p5 test

# Watch mode
pnpm --filter svelte-p5-components test:watch

# With coverage
pnpm --filter svelte-p5-components test:coverage
```

## What's tested where

| Package                | Environment | What                                                               |
| ---------------------- | ----------- | ------------------------------------------------------------------ |
| `svelte-p5`            | node        | Pure TypeScript utilities (color cache, hit-test, FES, bridge).    |
| `svelte-p5-viz`        | node        | Contract types, registry invariants, SceneState, scene JSON shape. |
| `svelte-p5-components` | happy-dom   | Snippet slot rendering, prop wiring, user events, ARIA on chrome.  |

## Writing a component test

Co-locate tests next to the component using `.test.svelte.ts` (so Svelte 5 runes compile) or `.test.ts` (plain TS):

```ts
// packages/components/src/lib/MyComponent.test.svelte.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import MyComponent from './MyComponent.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('<MyComponent>', () => {
	it('renders children snippet', () => {
		const { container } = render(MyComponent, {
			props: { children: snippet('<span>HELLO</span>') }
		});
		expect(container.textContent).toContain('HELLO');
	});
});
```

### Rules of thumb

- **Props go under `props:`.** `@testing-library/svelte@5` treats top-level keys as Svelte options (`target`, `anchor`, `context`). Always: `render(Comp, { props: { ... } })`.
- **Snippets via `createRawSnippet`.** A tiny helper makes test files readable: `const snippet = (html) => createRawSnippet(() => ({ render: () => html }))`.
- **Test the public API, not internals.** Check rendered DOM, callbacks, ARIA attributes — not internal state.
- **Floor, not ceiling.** 3–6 tests per component covering the public surface. Add more when a bug regresses.

## Known happy-dom limitations

- **Canvas APIs are shimmed, not implemented.** If a component draws into a canvas, its drawing logic needs a real browser (see Playwright smoke below). All current Tier S chrome components are HTML-based, so this doesn't bite them.
- **Svelte's scoped CSS cascade isn't fully resolved.** Don't assert on `getComputedStyle(el).pointerEvents` — assert on the marker class that applies the style instead.
- **Nested arrays inside a keyed `{#each}` over a `$derived` can read as empty.** Hit by `EntityToggleList` — see the file-header comment in its test. The workaround is to cover the render path in Playwright rather than fight the happy-dom edge case.

## Setup file

`packages/components/src/lib/tests/setup.ts` stubs `ResizeObserver` and `PointerEvent` so components that use them (Sketch, SplitPane, TimelineTrack) mount without throwing. Tests that need real resize or pointer behavior replace the stubs locally.

## Coverage

Per-package coverage via `pnpm --filter <pkg> test:coverage` produces a V8 HTML report under `coverage/`. No minimum threshold is enforced yet; the target is ≥70% on each package once the panel contract is exercised by transcript-explorer.

## What about Playwright?

End-to-end tests against `docs/examples/*` are planned. Each example boots, the canvas mounts, a simple interaction happens, and the test asserts no console errors plus a visual snapshot. This catches the happy-dom blind spots (canvas pixel ops, CSS cascade, p5 lifecycle in a real frame loop). See `hosting.md` for how Cloudflare Pages preview deploys make this practical per-PR.
