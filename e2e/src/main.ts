import { mount } from 'svelte';
import { disableFES } from 'svelte-p5/utils';
import Harness from './Harness.svelte';
import LifecycleHarness from './LifecycleHarness.svelte';
import TimelineHarness from './TimelineHarness.svelte';

const params = new URLSearchParams(window.location.search);
if (params.get('fes') === 'off') disableFES();

const roots = { timeline: TimelineHarness, lifecycle: LifecycleHarness };
const root = roots[params.get('component') as keyof typeof roots] ?? Harness;
mount(root, { target: document.getElementById('app')! });
