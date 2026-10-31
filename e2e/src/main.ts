import { mount } from 'svelte';
import { disableFES } from 'svelte-p5/utils';
import Harness from './Harness.svelte';
import DemandHarness from './DemandHarness.svelte';
import ExportHarness from './ExportHarness.svelte';
import LifecycleHarness from './LifecycleHarness.svelte';
import TimelineHarness from './TimelineHarness.svelte';

const params = new URLSearchParams(window.location.search);
if (params.get('fes') === 'off') disableFES();

const roots = {
	timeline: TimelineHarness,
	lifecycle: LifecycleHarness,
	demand: DemandHarness,
	export: ExportHarness
};
const root = roots[params.get('component') as keyof typeof roots] ?? Harness;
mount(root, { target: document.getElementById('app')! });
