import * as core from 'svelte-p5';
import * as utils from 'svelte-p5/utils';
import * as components from 'svelte-p5-components';
import * as youtube from 'svelte-p5-components/youtube';
import * as exporting from 'svelte-p5-components/export';
import * as viz from 'svelte-p5-viz';

export const surface = {
	'svelte-p5': Object.keys(core).sort(),
	'svelte-p5/utils': Object.keys(utils).sort(),
	'svelte-p5-components': Object.keys(components).sort(),
	'svelte-p5-components/youtube': Object.keys(youtube).sort(),
	'svelte-p5-components/export': Object.keys(exporting).sort(),
	'svelte-p5-viz': Object.keys(viz).sort()
};
