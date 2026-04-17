export const installPnpmSnippet = `pnpm add svelte-p5 svelte-p5-components p5`;

export const installNpmSnippet = `npm install svelte-p5 svelte-p5-components p5`;

export const installBunSnippet = `bun add svelte-p5 svelte-p5-components p5`;

export type CodeSnippet = { ts: string; js: string };

export const basicSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import { P5Canvas } from 'svelte-p5';
  import type p5 from 'p5';

  const sketch = (p: p5) => {
    let x = 200, y = 100, vx = 3, vy = 2;

    p.setup = () => {
      p.createCanvas(400, 300);
      p.noStroke();
    };

    p.draw = () => {
      p.background(245);
      x += vx; y += vy;
      if (x - 20 < 0 || x + 20 > p.width) vx *= -1;
      if (y - 20 < 0 || y + 20 > p.height) vy *= -1;
      p.fill(220, 60, 60);
      p.circle(x, y, 40);
    };
  };
</script>

<P5Canvas {sketch} />`,
	js: `<script>
  import { P5Canvas } from 'svelte-p5';

  const sketch = (p) => {
    let x = 200, y = 100, vx = 3, vy = 2;

    p.setup = () => {
      p.createCanvas(400, 300);
      p.noStroke();
    };

    p.draw = () => {
      p.background(245);
      x += vx; y += vy;
      if (x - 20 < 0 || x + 20 > p.width) vx *= -1;
      if (y - 20 < 0 || y + 20 > p.height) vy *= -1;
      p.fill(220, 60, 60);
      p.circle(x, y, 40);
    };
  };
</script>

<P5Canvas {sketch} />`
};

export const bridgeSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import { P5Canvas, createP5Bridge } from 'svelte-p5';
  import type p5 from 'p5';

  const bridge = createP5Bridge({
    radius: 40,
    hue: 200,
    speed: 2
  });

  const sketch = (p: p5) => {
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];

    p.setup = () => {
      p.createCanvas(400, 300);
      p.colorMode(p.HSB, 360, 100, 100, 1);
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: p.random(p.width), y: p.random(p.height),
          vx: p.random(-1, 1), vy: p.random(-1, 1)
        });
      }
    };

    p.draw = () => {
      p.background(220, 6, 98, 0.08);
      p.fill(bridge.state.hue, 70, 90, 0.85);
      p.noStroke();
      for (const pt of particles) {
        pt.x += pt.vx * bridge.state.speed;
        pt.y += pt.vy * bridge.state.speed;
        if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
        if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
        p.circle(pt.x, pt.y, bridge.state.radius);
      }
    };
  };
</script>

<P5Canvas {sketch} />
<input type="range" min="10" max="80" bind:value={bridge.state.radius} />
<input type="range" min="0" max="360" bind:value={bridge.state.hue} />`,
	js: `<script>
  import { P5Canvas, createP5Bridge } from 'svelte-p5';

  const bridge = createP5Bridge({
    radius: 40,
    hue: 200,
    speed: 2
  });

  const sketch = (p) => {
    const particles = [];

    p.setup = () => {
      p.createCanvas(400, 300);
      p.colorMode(p.HSB, 360, 100, 100, 1);
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: p.random(p.width), y: p.random(p.height),
          vx: p.random(-1, 1), vy: p.random(-1, 1)
        });
      }
    };

    p.draw = () => {
      p.background(220, 6, 98, 0.08);
      p.fill(bridge.state.hue, 70, 90, 0.85);
      p.noStroke();
      for (const pt of particles) {
        pt.x += pt.vx * bridge.state.speed;
        pt.y += pt.vy * bridge.state.speed;
        if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
        if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
        p.circle(pt.x, pt.y, bridge.state.radius);
      }
    };
  };
</script>

<P5Canvas {sketch} />
<input type="range" min="10" max="80" bind:value={bridge.state.radius} />
<input type="range" min="0" max="360" bind:value={bridge.state.hue} />`
};

export const componentsSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import {
    Sketch,        // Auto-resize + HiDPI canvas
    FPSMonitor,    // FPS overlay
    SketchDebug,   // Mouse, size, frame info overlay
    DraggableSketch // Floating, draggable p5 window
  } from 'svelte-p5-components';
  import type p5 from 'p5';

  let instance = $state<p5 | null>(null);

  const sketch = (p: p5) => {
    p.setup = () => p.createCanvas(400, 300);
    p.draw = () => {
      p.background(220, 20, 15);
      p.noStroke();
      const t = p.frameCount * 0.02;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * p.TWO_PI + t;
        const r = 80 + Math.sin(t + i) * 30;
        p.fill((200 + i * 15) % 360, 70, 90);
        p.circle(
          p.width / 2 + Math.cos(a) * r,
          p.height / 2 + Math.sin(a) * r,
          14
        );
      }
    };
  };
</script>

<!-- Responsive canvas with HiDPI + FPS overlay -->
<div style="width: 100%; height: 300px; position: relative;">
  <Sketch {sketch} bind:instance />
  <FPSMonitor {instance} />
</div>

<!-- Or a floating, draggable sketch window -->
<DraggableSketch
  title="orbit"
  {sketch}
  initialX={40}
  initialY={80}
  width={440}
  height={340}
/>`,
	js: `<script>
  import {
    Sketch,        // Auto-resize + HiDPI canvas
    FPSMonitor,    // FPS overlay
    SketchDebug,   // Mouse, size, frame info overlay
    DraggableSketch // Floating, draggable p5 window
  } from 'svelte-p5-components';

  let instance = $state(null);

  const sketch = (p) => {
    p.setup = () => p.createCanvas(400, 300);
    p.draw = () => {
      p.background(220, 20, 15);
      p.noStroke();
      const t = p.frameCount * 0.02;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * p.TWO_PI + t;
        const r = 80 + Math.sin(t + i) * 30;
        p.fill((200 + i * 15) % 360, 70, 90);
        p.circle(
          p.width / 2 + Math.cos(a) * r,
          p.height / 2 + Math.sin(a) * r,
          14
        );
      }
    };
  };
</script>

<!-- Responsive canvas with HiDPI + FPS overlay -->
<div style="width: 100%; height: 300px; position: relative;">
  <Sketch {sketch} bind:instance />
  <FPSMonitor {instance} />
</div>

<!-- Or a floating, draggable sketch window -->
<DraggableSketch
  title="orbit"
  {sketch}
  initialX={40}
  initialY={80}
  width={440}
  height={340}
/>`
};

export const sharedStateSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import { P5Canvas, createP5Bridge } from 'svelte-p5';
  import type p5 from 'p5';

  // One bridge, two sketches. Both read \`shared.state\` every frame,
  // so a single slider drives both canvases simultaneously.
  // For app-wide state, use a class in a .svelte.ts file instead.
  const shared = createP5Bridge({
    hue: 200,
    speed: 1,
    count: 18
  });

  const orbitSketch = (p: p5) => {
    p.setup = () => p.createCanvas(220, 220);
    p.draw = () => {
      const t = p.frameCount * 0.02 * shared.state.speed;
      for (let i = 0; i < shared.state.count; i++) {
        const a = (i / shared.state.count) * p.TWO_PI + t;
        // ... read shared.state.hue, shared.state.count, etc.
      }
    };
  };

  const gridSketch = (p: p5) => {
    p.setup = () => p.createCanvas(220, 220);
    p.draw = () => {
      // ... reads from the same shared.state
    };
  };
</script>

<P5Canvas sketch={orbitSketch} />
<P5Canvas sketch={gridSketch} />

<input type="range" min="0" max="360" bind:value={shared.state.hue} />
<input type="range" min="0.2" max="3" step="0.1" bind:value={shared.state.speed} />
<input type="range" min="6" max="40" bind:value={shared.state.count} />`,
	js: `<script>
  import { P5Canvas, createP5Bridge } from 'svelte-p5';

  // One bridge, two sketches. Both read \`shared.state\` every frame,
  // so a single slider drives both canvases simultaneously.
  // For app-wide state, use a class in a .svelte.js file instead.
  const shared = createP5Bridge({
    hue: 200,
    speed: 1,
    count: 18
  });

  const orbitSketch = (p) => {
    p.setup = () => p.createCanvas(220, 220);
    p.draw = () => {
      const t = p.frameCount * 0.02 * shared.state.speed;
      for (let i = 0; i < shared.state.count; i++) {
        const a = (i / shared.state.count) * p.TWO_PI + t;
        // ... read shared.state.hue, shared.state.count, etc.
      }
    };
  };

  const gridSketch = (p) => {
    p.setup = () => p.createCanvas(220, 220);
    p.draw = () => {
      // ... reads from the same shared.state
    };
  };
</script>

<P5Canvas sketch={orbitSketch} />
<P5Canvas sketch={gridSketch} />

<input type="range" min="0" max="360" bind:value={shared.state.hue} />
<input type="range" min="0.2" max="3" step="0.1" bind:value={shared.state.speed} />
<input type="range" min="6" max="40" bind:value={shared.state.count} />`
};

export const interactionSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import { P5Canvas, createP5Bridge } from 'svelte-p5';
  import { hitTest } from 'svelte-p5/utils';
  import type p5 from 'p5';

  const targets = [
    { id: 'a', x: 90,  y: 90,  r: 28 },
    { id: 'b', x: 220, y: 130, r: 28 },
    { id: 'c', x: 130, y: 200, r: 28 }
  ];

  // Reactive state shared with the surrounding UI
  const ui = createP5Bridge<{
    hovered: string | null;
    particles: number;
  }>({ hovered: null, particles: 0 });

  const sketch = (p: p5) => {
    const particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    p.setup = () => p.createCanvas(360, 270);

    p.mousePressed = () => {
      // Burst of particles at the click point
      for (let i = 0; i < 20; i++) {
        const a = p.random(p.TWO_PI), s = p.random(1, 4);
        particles.push({
          x: p.mouseX, y: p.mouseY,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1
        });
      }
    };

    p.draw = () => {
      // Hit-test the targets, write hover into shared state
      let hover = null;
      for (const t of targets) {
        if (hitTest.circle(p.mouseX, p.mouseY, t.x, t.y, t.r * 2)) hover = t.id;
      }
      if (ui.state.hovered !== hover) ui.state.hovered = hover;

      // ... draw targets and particles
    };
  };
</script>

<P5Canvas {sketch} />
<p>hovered: {ui.state.hovered ?? 'none'}</p>
<p>particles: {ui.state.particles}</p>`,
	js: `<script>
  import { P5Canvas, createP5Bridge } from 'svelte-p5';
  import { hitTest } from 'svelte-p5/utils';

  const targets = [
    { id: 'a', x: 90,  y: 90,  r: 28 },
    { id: 'b', x: 220, y: 130, r: 28 },
    { id: 'c', x: 130, y: 200, r: 28 }
  ];

  // Reactive state shared with the surrounding UI
  const ui = createP5Bridge({ hovered: null, particles: 0 });

  const sketch = (p) => {
    const particles = [];

    p.setup = () => p.createCanvas(360, 270);

    p.mousePressed = () => {
      // Burst of particles at the click point
      for (let i = 0; i < 20; i++) {
        const a = p.random(p.TWO_PI), s = p.random(1, 4);
        particles.push({
          x: p.mouseX, y: p.mouseY,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 1
        });
      }
    };

    p.draw = () => {
      // Hit-test the targets, write hover into shared state
      let hover = null;
      for (const t of targets) {
        if (hitTest.circle(p.mouseX, p.mouseY, t.x, t.y, t.r * 2)) hover = t.id;
      }
      if (ui.state.hovered !== hover) ui.state.hovered = hover;

      // ... draw targets and particles
    };
  };
</script>

<P5Canvas {sketch} />
<p>hovered: {ui.state.hovered ?? 'none'}</p>
<p>particles: {ui.state.particles}</p>`
};

export const draggableSketchSnippet: CodeSnippet = {
	ts: `<script lang="ts">
  import { DraggableSketch } from 'svelte-p5-components';
  import type p5 from 'p5';

  const sketch = (p: p5) => {
    p.setup = () => p.createCanvas(260, 180);
    p.draw = () => {
      const t = p.frameCount * 0.03;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * p.TWO_PI + t;
        const r = 50 + Math.sin(t + i * 0.5) * 16;
        p.circle(
          p.width / 2 + Math.cos(a) * r,
          p.height / 2 + Math.sin(a) * r,
          10
        );
      }
    };
  };
</script>

<!-- Floating, draggable sketch window. \`constrained\`
     keeps it inside the parent (or "viewport"). -->
<DraggableSketch
  {sketch}
  title="orbit.svelte"
  initialX={20}
  initialY={20}
  width={280}
  height={220}
  constrained="parent"
/>`,
	js: `<script>
  import { DraggableSketch } from 'svelte-p5-components';

  const sketch = (p) => {
    p.setup = () => p.createCanvas(260, 180);
    p.draw = () => {
      const t = p.frameCount * 0.03;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * p.TWO_PI + t;
        const r = 50 + Math.sin(t + i * 0.5) * 16;
        p.circle(
          p.width / 2 + Math.cos(a) * r,
          p.height / 2 + Math.sin(a) * r,
          10
        );
      }
    };
  };
</script>

<!-- Floating, draggable sketch window. \`constrained\`
     keeps it inside the parent (or "viewport"). -->
<DraggableSketch
  {sketch}
  title="orbit.svelte"
  initialX={20}
  initialY={20}
  width={280}
  height={220}
  constrained="parent"
/>`
};
