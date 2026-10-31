import { mount } from 'svelte';
import { disableFES } from 'svelte-p5/utils';
import Harness from './Harness.svelte';

const params = new URLSearchParams(window.location.search);
if (params.get('fes') === 'off') disableFES();

mount(Harness, { target: document.getElementById('app')! });
