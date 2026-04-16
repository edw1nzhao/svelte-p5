import { browser } from '$app/environment';

export type PkgManager = 'bun' | 'pnpm' | 'npm';
export type CodeLang = 'ts' | 'js';

export const PKG_MANAGERS: PkgManager[] = ['bun', 'pnpm', 'npm'];
export const CODE_LANGS: CodeLang[] = ['ts', 'js'];

const PM_KEY = 'svelte-p5:pkgManager';
const LANG_KEY = 'svelte-p5:codeLang';

function readPm(): PkgManager {
	if (!browser) return 'bun';
	const v = localStorage.getItem(PM_KEY);
	return PKG_MANAGERS.includes(v as PkgManager) ? (v as PkgManager) : 'bun';
}

function readLang(): CodeLang {
	if (!browser) return 'ts';
	const v = localStorage.getItem(LANG_KEY);
	return CODE_LANGS.includes(v as CodeLang) ? (v as CodeLang) : 'ts';
}

class Preferences {
	pkgManager = $state<PkgManager>(readPm());
	codeLang = $state<CodeLang>(readLang());

	setPkgManager(v: PkgManager) {
		this.pkgManager = v;
		if (browser) localStorage.setItem(PM_KEY, v);
	}
	setCodeLang(v: CodeLang) {
		this.codeLang = v;
		if (browser) localStorage.setItem(LANG_KEY, v);
	}
}

export const preferences = new Preferences();

if (browser) {
	window.addEventListener('storage', (e) => {
		if (e.key === PM_KEY && e.newValue && PKG_MANAGERS.includes(e.newValue as PkgManager)) {
			preferences.pkgManager = e.newValue as PkgManager;
		}
		if (e.key === LANG_KEY && e.newValue && CODE_LANGS.includes(e.newValue as CodeLang)) {
			preferences.codeLang = e.newValue as CodeLang;
		}
	});
}
