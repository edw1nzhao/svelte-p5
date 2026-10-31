/** The p5 members svelte-p5 drives directly; identical on p5 1.11 and 2.x. */
export interface Drawable {
	redraw(): unknown;
	loop(): void;
	noLoop(): void;
	isLooping(): boolean;
	frameCount: number;
	deltaTime: number;
	_setupDone?: boolean;
	_inUserDraw?: boolean;
}

export const drawable = (p: unknown) => p as Drawable;

/** True once p5 itself has finished setup; `redraw()` silently does nothing before that. */
export const setupDone = (p: unknown) => drawable(p)._setupDone !== false;

export const redrawBlocked = (p: unknown) => !setupDone(p) || drawable(p)._inUserDraw === true;
