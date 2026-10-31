import { mount } from 'svelte';
import { disableFES } from 'svelte-p5/utils';
import Harness from './Harness.svelte';
import TimelineHarness from './TimelineHarness.svelte';

const params = new URLSearchParams(window.location.search);
if (params.get('fes') === 'off') disableFES();

const root = params.get('component') === 'timeline' ? TimelineHarness : Harness;
mount(root, { target: document.getElementById('app')! });
