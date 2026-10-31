import { mount } from 'svelte';
import { P5Canvas } from 'svelte-p5';

mount(P5Canvas, { target: document.body, props: { sketch: () => {} } });
