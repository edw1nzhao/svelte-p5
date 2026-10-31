import { mount } from 'svelte';
import Smoke from '../smoke/Smoke.svelte';
import { surface } from '../smoke/entries.js';

console.log(surface);
mount(Smoke, { target: document.body });
