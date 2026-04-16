/**
 * Conventional Commits enforcement — aligns with release-please parsing.
 * See: https://www.conventionalcommits.org/
 *      https://github.com/googleapis/release-please
 */
module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']
		],
		'subject-case': [0],
		'header-max-length': [2, 'always', 100]
	}
};
