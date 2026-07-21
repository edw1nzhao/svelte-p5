# Changelog

## [0.6.0](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.5.0...components-v0.6.0) (2026-07-21)


### Features

* **components:** Sketch onResize callback and explicit pixel-density control ([a0ad753](https://github.com/edw1nzhao/svelte-p5/commit/a0ad7531fd8b6456f7e3b882f698a234ed14b354))


### Bug Fixes

* **components:** declare @neodrag/core as a direct dependency ([ad5be06](https://github.com/edw1nzhao/svelte-p5/commit/ad5be066facc52c33b9bc3c130ab6490ba3eb634))
* **components:** publish a real semver range for the svelte-p5 peer ([bd1e46c](https://github.com/edw1nzhao/svelte-p5/commit/bd1e46c6138a668e0c4a398363593342e148784c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * svelte-p5 bumped to 0.4.0
  * peerDependencies
    * svelte-p5 bumped from >=0.3.0 <1 to >=0.4.0

## [0.5.0](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.4.1...components-v0.5.0) (2026-06-09)


### ⚠ BREAKING CHANGES

* **components:** timeline selection model and YouTube-style scrubber

### Features

* **components:** add ActivityBar, SidePanel, ContextMenu primitives ([ed6d1b7](https://github.com/edw1nzhao/svelte-p5/commit/ed6d1b74c04d463433a664622e15dbf5a8b28c5b))
* **components:** add createMediaPlayback orchestrator for per-visualization video playback ([058b3b6](https://github.com/edw1nzhao/svelte-p5/commit/058b3b6b75a3f38b15d8967d4b53aedef86f40fb))
* **components:** add playheadFollowsSelectionStart option and polish timeline handles ([cb99676](https://github.com/edw1nzhao/svelte-p5/commit/cb99676c33042de54f5b7ac82a8c360b73f77401))
* **components:** animate SidePanel open and close symmetrically ([ecee286](https://github.com/edw1nzhao/svelte-p5/commit/ecee286af528f6b4cc6d6ca15bb58b692ae8498e))
* **components:** EntityToggleList inline rename and theme inheritance ([4ffb3f4](https://github.com/edw1nzhao/svelte-p5/commit/4ffb3f4c2b1cf9b707cfac6958939b818fb079d0))


### Bug Fixes

* **components:** resolve typecheck errors and gate pre-commit on typecheck ([3dd6a08](https://github.com/edw1nzhao/svelte-p5/commit/3dd6a084bc909abe88247b92ef2b078f2ee1eff3))


### Refactors

* **components:** timeline selection model and YouTube-style scrubber ([08e2aa1](https://github.com/edw1nzhao/svelte-p5/commit/08e2aa19ba91323ffe076cfc30b4570ce09559b1))

## [0.4.1](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.4.0...components-v0.4.1) (2026-04-17)


### Bug Fixes

* **components:** clamp DraggableWindow to parent on resize; reserve d… ([#36](https://github.com/edw1nzhao/svelte-p5/issues/36)) ([4376112](https://github.com/edw1nzhao/svelte-p5/commit/43761124dbf82a3001d828c81e593c95994f1bb2))

## [0.4.0](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.3.0...components-v0.4.0) (2026-04-16)


### Features

* **components:** add &lt;CanvasFrame&gt; layout shell ([c95e058](https://github.com/edw1nzhao/svelte-p5/commit/c95e05876198e335f8cfaad0c3d318c3686324f8))
* **components:** add &lt;EntityToggleList&gt; speaker/actor toggle panel ([ab0ff73](https://github.com/edw1nzhao/svelte-p5/commit/ab0ff7327a9699c7ac8313c9e1fee16b18e1da1f))
* **components:** add &lt;HoverTooltip&gt; smart-positioned floating label ([a431bf3](https://github.com/edw1nzhao/svelte-p5/commit/a431bf364aa9f2532d23efc413639a0936ab28b2))
* **components:** add &lt;SplitPane&gt; resizable two-panel split ([d263b2e](https://github.com/edw1nzhao/svelte-p5/commit/d263b2e54a6119da0f2c06d93c5155a1a46d1d72))
* **components:** add &lt;TimelineTrack&gt;, &lt;TimelineScrubber&gt;, createMediaSync ([c4d739c](https://github.com/edw1nzhao/svelte-p5/commit/c4d739cd5ffd3d648ff3e1aff873e76febbe9147))

## [0.3.0](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.2.1...components-v0.3.0) (2026-04-16)


### Features

* **site:** docs pages, mobile-first nav/footer, feedback widget ([#21](https://github.com/edw1nzhao/svelte-p5/issues/21)) ([e80b570](https://github.com/edw1nzhao/svelte-p5/commit/e80b5706cfdcf719f4511ea8077974da61267d8e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * svelte-p5 bumped to 0.3.0
  * peerDependencies
    * svelte-p5 bumped to 0.3.0

## [0.2.1](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.2.0...components-v0.2.1) (2026-04-16)


### Bug Fixes

* correct GitHub username in repository URLs (edwinzhao -&gt; edw1nzhao) ([#16](https://github.com/edw1nzhao/svelte-p5/issues/16)) ([4e49478](https://github.com/edw1nzhao/svelte-p5/commit/4e4947882172d57ee0e3862eb0240985722a91a2))

## [0.2.0](https://github.com/edw1nzhao/svelte-p5/compare/components-v0.1.0...components-v0.2.0) (2026-04-16)


### Features

* initial 0.1.0 release ([c567aef](https://github.com/edw1nzhao/svelte-p5/commit/c567aef09c6d56b194dce56b231f0befe5f2cdb6))
