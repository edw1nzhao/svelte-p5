# No-code product vision

This is where the library is heading, as context for design decisions made in `svelte-p5-viz` and the chrome components. There's no product yet; persistence, hosting, and auth are all explicitly out of scope until the shape of the runtime is real.

## Who it's for

Teacher educators, PhD peers, and researchers who want to build canvas-based visualizations over their own data without writing code. Think someone who has a CSV of classroom talk and wants to see a speaker garden, a word cloud, and a timeline scrubber on one screen — today they can't produce that without a developer.

Support will be human-in-the-loop: we help people set up their scenes during the early period. Self-serve comes later, if at all.

## What it is

A separate app (planned repo name `svelte-p5-studio`) that does three things:

1. **Read and write `SceneConfig` JSON documents.** The viz contract package already defines this shape. A scene is a list of panels and a layout.
2. **Render scenes at runtime** using the chrome components (`<CanvasFrame>`, `<SplitPane>`, `<TimelineScrubber>`, `<HoverTooltip>`, `<EntityToggleList>`) plus a registry of `VizPanel` implementations.
3. **Edit scenes interactively** — pick a panel from a catalog, drop it into a layout slot, tune its config through a property inspector generated from the panel's schema.

The studio is deliberately downstream of the library. Nothing the studio needs should require breaking library API — if it does, that's a signal the library abstraction is wrong.

## Why the library looks the way it does

Several decisions in the library are load-bearing for the no-code goal:

- **`VizPanel.type` is a string registered in a `PanelRegistry`.** The studio needs to list available panels; a registry keyed by string makes that a one-liner. The alternative (class-based discovery, decorators) leaks runtime metadata the studio would have to reinvent.
- **`VizPanel.defaultConfig` is a concrete value, not a factory.** Panels can be instantiated at page-load without the app having to guess sensible defaults.
- **`VizPanel.schema` is typed as `unknown`.** The studio will inspect a schema to render property inspectors, but the library shouldn't hardcode zod/valibot/JSON Schema. Consumers pick their validation library; the studio will adapt via [Standard Schema](https://standardschema.dev) once it lands.
- **`SceneConfig` is JSON-serializable.** You can hand-author one, read one from a URL hash, persist one to localStorage, or export one to a file. The library ships no persistence — persistence is a studio concern and a user-choice concern.
- **Cross-highlighting goes through `SceneState`, not panel-to-panel events.** Panels read `PanelContext.highlights` and return hits via `PanelResult.hover`. A scene runner funnels hits into `SceneState`. There's no event bus for the studio to recreate.
- **Chrome uses snippets, not named slots.** A studio editor that injects chrome programmatically can pass Svelte snippets dynamically; named slots would force string-keyed children that fight the framework.

## What the studio will not try to do

- **Be a general dashboard builder.** The scope is canvas-based scientific visualization, not BI.
- **Ship its own rendering.** Everything it renders comes through a `VizPanel` registered by the app.
- **Host anyone's data.** Scenes reference data that lives on the user's machine (uploaded CSVs) or their own storage. The studio may ship static hosting for exported scenes, but it won't warehouse user data.
- **Outgrow the library's chrome.** If the studio needs layout capabilities `<CanvasFrame>` / `<SplitPane>` can't express, those go into `svelte-p5-components` first, not into the studio.

## Rough roadmap

1. **Today.** Library ships `svelte-p5-viz` (contract + registry + scene format) and the chrome set in `svelte-p5-components`. Consumer apps (transcript-explorer first) migrate to the contract.
2. **Viz pack.** Extract 3-5 generalisable panels from the consumer apps into a `svelte-p5-viz-pack` (tentative name) — things like a `TimelineTrack` panel, a `DotPlot` panel, a `CategoricalCloud`. App-specific panels stay in apps.
3. **Studio MVP.** Separate repo. Upload CSV → column mapping → pick panels from the pack catalog → arrange in single / split / grid layout → save/load JSON. No auth, no cloud persistence — scenes live in localStorage and exports.
4. **Studio iteration.** Property inspectors from `VizPanel.schema`. Collaborative pre-baked "starter scenes" (e.g. "transcript overview", "dot-plot dashboard"). Export to standalone HTML that embeds the runtime.
5. **Persistence / hosting.** Only once the shape of a scene document is demonstrably stable. Before that, relying on a hosted backend is a trap.

## Why document this now

Because it affects what we refuse to build into the library. The studio goal is the reason `svelte-p5-components` ships a `speedLocked` prop on `<TimelineScrubber>` (so the UX can disclose video override without every app reinventing the branch), the reason scene layouts are limited to single / split / grid (expressible as JSON, not arbitrary snippet trees), and the reason the viz contract stays schema-agnostic.

If the no-code goal is dropped, most of these decisions still hold because they also serve the "compose multiple panels cleanly in one app" case. But it's worth naming the direction so future design conversations can refer to it.
