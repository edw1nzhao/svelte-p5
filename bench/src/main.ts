import { mount } from 'svelte';
import Modern from './Modern.svelte';
import Legacy from './Legacy.svelte';

const target = document.getElementById('app')!;
const harness = new URLSearchParams(window.location.search).get('harness') ?? 'modern';

mount(harness === 'legacy' ? Legacy : Modern, { target });
