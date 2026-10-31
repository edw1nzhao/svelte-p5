export interface PlaygroundExample {
	id: string;
	label: string;
	code: string;
	/** The `<Sketch loop>` mode the example runs with; default 'always'. */
	loop?: 'always' | 'demand';
}

const orbit = `// The sliders and colour picker write to bridge.state;
// draw() reads it every frame, so changes show up live.
let t = 0;

p.setup = () => {
  p.createCanvas(400, 400);
  p.noStroke();
};

p.draw = () => {
  p.background(248, 250, 252);
  p.translate(p.width / 2, p.height / 2);
  t += 0.01 * bridge.state.speed;

  const c = p.color(bridge.state.color);
  for (let ring = 1; ring <= 5; ring++) {
    const count = ring * 6;
    const radius = ring * Math.min(p.width, p.height) * 0.08;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * p.TWO_PI + t * (ring % 2 ? 1 : -1);
      c.setAlpha(255 - ring * 30);
      p.fill(c);
      p.circle(Math.cos(a) * radius, Math.sin(a) * radius, bridge.state.size * (1 - ring * 0.12));
    }
  }
};
`;

const flowField = `// Particles follow a Perlin noise field and leave trails.
const particles = [];

p.setup = () => {
  p.createCanvas(400, 400);
  p.background(15, 23, 42);
  for (let i = 0; i < 600; i++) {
    particles.push(p.createVector(p.random(p.width), p.random(p.height)));
  }
};

p.draw = () => {
  p.background(15, 23, 42, 12);
  p.stroke(129, 140, 248, 90);
  for (const pt of particles) {
    const angle = p.noise(pt.x * 0.004, pt.y * 0.004, p.frameCount * 0.002) * p.TWO_PI * 2;
    const prev = pt.copy();
    pt.add(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5);
    if (pt.x < 0 || pt.x > p.width || pt.y < 0 || pt.y > p.height) {
      pt.set(p.random(p.width), p.random(p.height));
      continue;
    }
    p.line(prev.x, prev.y, pt.x, pt.y);
  }
};
`;

const tree = `// Move the mouse left and right to bend the branches.
p.setup = () => {
  p.createCanvas(400, 400);
  p.stroke(30, 41, 59);
};

function branch(len, depth) {
  p.strokeWeight(depth);
  p.line(0, 0, 0, -len);
  p.translate(0, -len);
  if (depth <= 1) return;
  const spread = p.map(p.mouseX, 0, p.width, 0.2, 1.2, true);
  for (const dir of [-1, 1]) {
    p.push();
    p.rotate(dir * spread);
    branch(len * 0.7, depth - 1);
    p.pop();
  }
}

p.draw = () => {
  p.background(248, 250, 252);
  p.translate(p.width / 2, p.height);
  branch(p.height * 0.28, 9);
};
`;

const bounce = `// Click to add a ball.
const balls = [];

function addBall(x, y) {
  balls.push({ x, y, vx: p.random(-3, 3), vy: p.random(-6, -2), hue: p.random(200, 320) });
}

p.setup = () => {
  p.createCanvas(400, 400);
  p.colorMode(p.HSB);
  p.noStroke();
  for (let i = 0; i < 12; i++) addBall(p.random(p.width), p.random(p.height / 2));
};

p.mousePressed = () => addBall(p.mouseX, p.mouseY);

p.draw = () => {
  p.background(0, 0, 98);
  for (const b of balls) {
    b.vy += 0.25;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > p.height - 12) { b.y = p.height - 12; b.vy *= -0.85; }
    if (b.x < 12 || b.x > p.width - 12) b.vx *= -1;
    p.fill(b.hue, 70, 90);
    p.circle(b.x, b.y, 24);
  }
};
`;

const sizeCache = `// Click the canvas to switch between reading p.width and p.height inside the
// hot loop and caching them in locals once per frame. The Speed slider sets
// the work per frame (3 generations per unit), so raise it on a fast machine.
const SCALE = 2;
let cols = 0;
let rows = 0;
let grid = new Uint8Array(0);
let next = new Uint8Array(0);
let cached = false;
let fps = 0;
let stepMs = 0;

function reseed() {
  cols = Math.floor(p.width / SCALE);
  rows = Math.floor(p.height / SCALE);
  grid = new Uint8Array(cols * rows);
  next = new Uint8Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = p.random() < 0.25 ? 1 : 0;
}

// Reads p.width and p.height for every neighbour lookup.
function stepNaive() {
  for (let y = 0; y < Math.floor(p.height / SCALE); y++) {
    for (let x = 0; x < Math.floor(p.width / SCALE); x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + Math.floor(p.width / SCALE)) % Math.floor(p.width / SCALE);
          const ny = (y + dy + Math.floor(p.height / SCALE)) % Math.floor(p.height / SCALE);
          n += grid[ny * Math.floor(p.width / SCALE) + nx];
        }
      }
      const i = y * Math.floor(p.width / SCALE) + x;
      next[i] = n === 3 || (n === 2 && grid[i]) ? 1 : 0;
    }
  }
}

// Same work, with the size read once per frame.
function stepCached() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          n += grid[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
        }
      }
      const i = y * cols + x;
      next[i] = n === 3 || (n === 2 && grid[i]) ? 1 : 0;
    }
  }
}

p.setup = () => {
  p.createCanvas(400, 300);
  p.noStroke();
  reseed();
};

p.mousePressed = () => {
  if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
  cached = !cached;
};

p.draw = () => {
  // <Sketch> resizes the canvas to its container after setup.
  if (cols !== Math.floor(p.width / SCALE) || rows !== Math.floor(p.height / SCALE)) reseed();

  const t0 = performance.now();
  for (let g = 0; g < Math.max(1, Math.round(bridge.state.speed * 3)); g++) {
    if (cached) stepCached();
    else stepNaive();
    [grid, next] = [next, grid];
  }
  stepMs = p.lerp(stepMs, performance.now() - t0, 0.1);

  p.background(248, 250, 252);
  p.fill(79, 70, 229);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y * cols + x]) p.rect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }

  fps = p.lerp(fps, p.frameRate(), 0.1);
  p.fill(15, 23, 42);
  p.rect(0, 0, 250, 22);
  p.fill(255);
  p.textSize(13);
  p.text((cached ? 'cached' : 'p.width/p.height') + ': ' + fps.toFixed(0) + ' fps, step ' + stepMs.toFixed(1) + ' ms', 8, 16);
};
`;

const demand = `// Runs with loop="demand": draw() only runs when the bridge state changes
// or the canvas resizes. Watch "Frames drawn" stay still while you are idle.
p.setup = () => {
  p.noStroke();
};

p.draw = () => {
  p.background(248, 250, 252);
  const c = p.color(bridge.state.color);
  const step = bridge.state.size + 8;
  for (let y = step / 2; y < p.height; y += step) {
    for (let x = step / 2; x < p.width; x += step) {
      const d = p.dist(x, y, p.width / 2, p.height / 2);
      c.setAlpha(255 - (d * 255) / (p.width * 0.75));
      p.fill(c);
      p.circle(x, y, bridge.state.size * (0.4 + 0.15 * bridge.state.speed));
    }
  }
};
`;

export const EXAMPLES: PlaygroundExample[] = [
	{ id: 'orbit', label: 'Bridge orbit (Svelte controls)', code: orbit },
	{ id: 'flow-field', label: 'Flow field', code: flowField },
	{ id: 'tree', label: 'Recursive tree', code: tree },
	{ id: 'bounce', label: 'Bouncing balls', code: bounce },
	{ id: 'size-cache', label: 'p5 2: caching width and height', code: sizeCache },
	{ id: 'demand', label: 'On-demand rendering', code: demand, loop: 'demand' }
];

export const DEFAULT_EXAMPLE = EXAMPLES[0]!;
