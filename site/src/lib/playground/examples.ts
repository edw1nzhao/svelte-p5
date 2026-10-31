export interface PlaygroundExample {
	id: string;
	label: string;
	code: string;
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

export const EXAMPLES: PlaygroundExample[] = [
	{ id: 'orbit', label: 'Bridge orbit (Svelte controls)', code: orbit },
	{ id: 'flow-field', label: 'Flow field', code: flowField },
	{ id: 'tree', label: 'Recursive tree', code: tree },
	{ id: 'bounce', label: 'Bouncing balls', code: bounce }
];

export const DEFAULT_EXAMPLE = EXAMPLES[0]!;
