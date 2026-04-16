/**
 * A single reactive class for the whole dashboard.
 *
 * The `tick` counter advances independently of any single sketch - if a
 * sketch closes, the others keep animating. This is the correct pattern
 * for shared animation state.
 */

class DashboardState {
	tick = $state(0);
	hue = $state(200);
	density = $state(1);
	paused = $state(false);

	panels = $state({
		orbit: true,
		grid: true,
		noise: true
	});

	#raf = 0;

	constructor() {
		if (typeof window !== 'undefined') {
			const loop = () => {
				if (!this.paused) this.tick += 1;
				this.#raf = window.requestAnimationFrame(loop);
			};
			this.#raf = window.requestAnimationFrame(loop);
		}
	}

	togglePanel(key: keyof DashboardState['panels']) {
		this.panels[key] = !this.panels[key];
	}

	dispose() {
		if (typeof window !== 'undefined') window.cancelAnimationFrame(this.#raf);
	}
}

export const dashboard = new DashboardState();
