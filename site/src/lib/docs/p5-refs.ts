/**
 * Curated list of common p5.js global functions and variables that we
 * auto-link to the official p5.js reference when they appear in inline code
 * as `p.X`, `p.X(`, or `p.X.` in our docs.
 *
 * Conservative on purpose - only well-known, unambiguous names.
 * To add: drop the bare identifier into the appropriate set below.
 *
 * Reference URL: https://p5js.org/reference/p5/<name>/
 */

export const p5Refs = new Set<string>([
	// Setup / drawing
	'setup',
	'draw',
	'preload',
	'createCanvas',
	'resizeCanvas',
	'noCanvas',
	'remove',
	'redraw',
	'noLoop',
	'loop',
	'isLooping',
	'frameCount',
	'frameRate',
	'pixelDensity',
	'displayDensity',
	'windowResized',
	'windowWidth',
	'windowHeight',
	'width',
	'height',

	// 2D shapes
	'point',
	'line',
	'rect',
	'square',
	'circle',
	'ellipse',
	'arc',
	'triangle',
	'quad',
	'beginShape',
	'endShape',
	'vertex',
	'curveVertex',
	'bezierVertex',

	// Color / fill / stroke
	'background',
	'fill',
	'noFill',
	'stroke',
	'noStroke',
	'strokeWeight',
	'color',
	'colorMode',
	'lerpColor',
	'tint',
	'noTint',

	// Transformations
	'translate',
	'rotate',
	'scale',
	'shearX',
	'shearY',
	'push',
	'pop',
	'resetMatrix',

	// Text
	'text',
	'textSize',
	'textFont',
	'textAlign',
	'textWidth',
	'textLeading',
	'textStyle',
	'loadFont',

	// Image / pixels
	'image',
	'loadImage',
	'imageMode',
	'pixels',
	'loadPixels',
	'updatePixels',
	'get',
	'set',

	// Math / random
	'random',
	'randomGaussian',
	'noise',
	'noiseSeed',
	'randomSeed',
	'map',
	'lerp',
	'constrain',
	'dist',
	'mag',
	'sqrt',
	'pow',
	'abs',
	'min',
	'max',
	'floor',
	'ceil',
	'round',
	'sin',
	'cos',
	'tan',
	'atan2',

	// Constants
	'PI',
	'TWO_PI',
	'HALF_PI',
	'QUARTER_PI',
	'HSB',
	'RGB',
	'CENTER',
	'CORNER',
	'CORNERS',
	'RADIUS',
	'DEGREES',
	'RADIANS',

	// Input
	'mouseX',
	'mouseY',
	'pmouseX',
	'pmouseY',
	'mouseIsPressed',
	'mouseButton',
	'mousePressed',
	'mouseReleased',
	'mouseClicked',
	'mouseMoved',
	'mouseDragged',
	'mouseWheel',
	'doubleClicked',

	'keyIsPressed',
	'key',
	'keyCode',
	'keyPressed',
	'keyReleased',
	'keyTyped',

	'touches',
	'touchStarted',
	'touchMoved',
	'touchEnded',

	// WebGL (basic)
	'WEBGL',
	'box',
	'sphere',
	'cone',
	'cylinder',
	'plane',
	'torus',
	'camera',
	'perspective',
	'ortho',
	'lights',
	'ambientLight',
	'directionalLight',
	'pointLight'
]);

export const P5_REFERENCE_BASE = 'https://p5js.org/reference/p5/';
