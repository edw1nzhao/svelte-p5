export const installPnpmSnippet = `pnpm add svelte-p5 svelte-p5-components p5`;

export const installNpmSnippet = `npm install svelte-p5 svelte-p5-components p5`;

export const installBunSnippet = `bun add svelte-p5 svelte-p5-components p5`;

export const basicSnippet = `<script lang="ts">
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

<P5Canvas {sketch} />`;

export const bridgeSnippet = `<script lang="ts">
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
<input type="range" min="0" max="360" bind:value={bridge.state.hue} />`;

export const componentsSnippet = `<script lang="ts">
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
/>`;
