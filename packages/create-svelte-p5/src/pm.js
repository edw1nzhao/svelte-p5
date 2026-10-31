const KNOWN = ['pnpm', 'yarn', 'bun', 'npm'];

/**
 * @param {string | undefined} userAgent value of npm_config_user_agent
 * @returns {'npm' | 'pnpm' | 'yarn' | 'bun'}
 */
export function detectPackageManager(userAgent) {
	const name = userAgent?.split(' ')[0]?.split('/')[0];
	const found = KNOWN.find((k) => k === name);
	return /** @type {'npm' | 'pnpm' | 'yarn' | 'bun'} */ (found ?? 'npm');
}

/**
 * @param {string} pm
 * @param {string | null} cdDir directory to cd into, or null when already there
 * @returns {string[]}
 */
export function nextSteps(pm, cdDir) {
	const install = pm === 'yarn' ? 'yarn' : `${pm} install`;
	const dev = pm === 'npm' || pm === 'bun' ? `${pm} run dev` : `${pm} dev`;
	const steps = [];
	if (cdDir) steps.push(`cd ${cdDir.includes(' ') ? JSON.stringify(cdDir) : cdDir}`);
	steps.push(install, dev);
	return steps;
}
