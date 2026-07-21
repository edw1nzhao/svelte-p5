import { describe, it, expectTypeOf } from 'vitest';
import type p5 from 'p5';
import type { ExtendedP5, SketchFn } from './types.js';

interface DemoExt {
	resetView(): void;
	zoomLevel: number;
}

describe('SketchFn / ExtendedP5 generics', () => {
	it('non-generic SketchFn receives a plain p5 instance', () => {
		expectTypeOf<SketchFn>().parameter(0).toEqualTypeOf<p5 & unknown>();
	});

	it('SketchFn<Ext> receives the extended instance', () => {
		expectTypeOf<SketchFn<DemoExt>>().parameter(0).toEqualTypeOf<p5 & DemoExt>();
		const sketch: SketchFn<DemoExt> = (p) => {
			expectTypeOf(p.resetView).toEqualTypeOf<() => void>();
			expectTypeOf(p.zoomLevel).toEqualTypeOf<number>();
			expectTypeOf(p.createCanvas).toBeFunction();
		};
		void sketch;
	});

	it('bare SketchFn usage stays assignable where SketchFn<unknown> is expected', () => {
		const plain: SketchFn = () => {};
		expectTypeOf(plain).toExtend<SketchFn<unknown>>();
	});

	it('ExtendedP5<Ext> is the p5 & Ext intersection', () => {
		expectTypeOf<ExtendedP5<DemoExt>>().toEqualTypeOf<p5 & DemoExt>();
	});
});
