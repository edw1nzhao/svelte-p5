/**
 * TypeScript → JavaScript for docs code samples.
 *
 * Every code sample in `/docs` is written in TypeScript. Readers who don't use
 * TypeScript should still be able to copy a sample and have it work, so the
 * docs renderer offers a JS variant of each block (see `render.ts`).
 *
 * Approach: parse with the TypeScript compiler, collect the exact character
 * ranges occupied by type syntax, and delete those ranges from the original
 * source. We deliberately do NOT use `ts.transpileModule`, which re-prints the
 * AST — that reformats indentation, collapses blank lines, and (fatally for
 * Svelte samples) elides imports it believes are unused, which is every
 * component referenced only from markup.
 *
 * Deleting ranges out of the original text keeps formatting byte-identical
 * apart from the types themselves, while the compiler — not a regex — decides
 * what counts as a type.
 *
 * Conservative by design, in the same spirit as `translatePnpmLine`: anything
 * unrecognized returns `null` and the block stays TypeScript-only. A missing
 * JS tab is a much smaller problem than a JS tab containing broken code.
 */

import ts from 'typescript';

/** A half-open character range to remove from the source. */
interface Cut {
	start: number;
	end: number;
}

/** Thrown internally when a construct can't be safely erased. Callers get `null`. */
class Unsupported extends Error {}

/**
 * TS-only syntax we refuse to touch. These have no type-erasure-only
 * translation (they emit runtime code, or change semantics), and none of them
 * appear in the docs today — if one shows up, the block stays TS-only until
 * someone writes the JS variant by hand.
 */
function assertSupported(node: ts.Node): void {
	switch (node.kind) {
		case ts.SyntaxKind.EnumDeclaration:
		case ts.SyntaxKind.ModuleDeclaration:
		case ts.SyntaxKind.ImportEqualsDeclaration:
		case ts.SyntaxKind.TypeAssertionExpression: // <T>x — ambiguous with JSX
			throw new Unsupported(ts.SyntaxKind[node.kind]);
	}

	// `constructor(private readonly x: string)` declares a field as a side
	// effect of the annotation, so erasing the type would change behaviour.
	if (ts.isParameter(node) && node.modifiers?.length) {
		throw new Unsupported('parameter property');
	}
}

/** Scan backwards from `from` for `char`, skipping whitespace only. */
function scanBack(text: string, from: number, char: string): number {
	let i = from - 1;
	while (i >= 0 && /\s/.test(text[i]!)) i--;
	if (text[i] !== char) throw new Unsupported(`expected ${char} before ${from}`);
	return i;
}

/** Scan forwards from `from` for `char`, skipping whitespace only. */
function scanForward(text: string, from: number, char: string): number {
	let i = from;
	while (i < text.length && /\s/.test(text[i]!)) i++;
	if (text[i] !== char) throw new Unsupported(`expected ${char} after ${from}`);
	return i + 1;
}

/**
 * Collect the ranges of every type-only construct in `sf`.
 */
function collectCuts(sf: ts.SourceFile, text: string): Cut[] {
	const cuts: Cut[] = [];

	const cutTypeAnnotation = (typeNode: ts.TypeNode) => {
		// Delete from the `:` (plus a preceding `?` for optional members)
		// through the end of the type, so `(p: p5)` becomes `(p)` with no
		// leftover whitespace.
		let start = scanBack(text, typeNode.getStart(sf), ':');
		if (text[start - 1] === '?') start -= 1;
		cuts.push({ start, end: typeNode.end });
	};

	/** Delete a `<...>` list, including its angle brackets. */
	const cutAngleList = (list: ts.NodeArray<ts.Node>) => {
		const first = list[0];
		if (!first) return;
		const start = scanBack(text, first.getStart(sf), '<');
		const end = scanForward(text, list.end, '>');
		cuts.push({ start, end });
	};

	const visit = (node: ts.Node): void => {
		assertSupported(node);

		// Never descend into a type. Everything inside one is already covered
		// by the cut that removes the type as a whole, and generating nested
		// cuts here is actively harmful: a `: string` inside
		// `createP5Bridge<{ id: string }>(…)` would otherwise compete with the
		// cut for the surrounding `<…>` list.
		if (ts.isTypeNode(node)) return;

		// Whole statements that vanish entirely.
		if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
			cuts.push({ start: node.getStart(sf), end: node.end });
			return; // don't descend — the whole thing is gone
		}

		// `import type p5 from 'p5'` / `export type { Foo }`
		if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) {
			cuts.push({ start: node.getStart(sf), end: node.end });
			return;
		}
		if (ts.isExportDeclaration(node) && node.isTypeOnly) {
			cuts.push({ start: node.getStart(sf), end: node.end });
			return;
		}

		// `import { P5Canvas, type SketchFn }` — drop the type specifier and
		// the comma that separated it.
		if (ts.isImportSpecifier(node) && node.isTypeOnly) {
			const start = node.getStart(sf);
			let end = node.end;
			// Prefer eating a trailing comma; fall back to a leading one for
			// the last specifier in the list.
			let i = end;
			while (i < text.length && /\s/.test(text[i]!)) i++;
			if (text[i] === ',') {
				end = i + 1;
			} else {
				const before = scanBack(text, start, ',');
				cuts.push({ start: before, end });
				return;
			}
			cuts.push({ start, end });
			return;
		}

		// Type annotations: `x: Foo`, `(p: p5)`, `(): void`.
		if (
			(ts.isParameter(node) ||
				ts.isVariableDeclaration(node) ||
				ts.isPropertyDeclaration(node) ||
				ts.isPropertySignature(node) ||
				ts.isFunctionDeclaration(node) ||
				ts.isFunctionExpression(node) ||
				ts.isArrowFunction(node) ||
				ts.isMethodDeclaration(node) ||
				ts.isGetAccessorDeclaration(node)) &&
			node.type
		) {
			cutTypeAnnotation(node.type);
		}

		// Generic parameter lists on declarations: `function f<T>()`.
		if (
			(ts.isFunctionDeclaration(node) ||
				ts.isFunctionExpression(node) ||
				ts.isArrowFunction(node) ||
				ts.isMethodDeclaration(node) ||
				ts.isClassDeclaration(node)) &&
			node.typeParameters
		) {
			cutAngleList(node.typeParameters);
		}

		// Explicit type arguments at call sites: `$state<p5 | null>(null)`.
		if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.typeArguments) {
			cutAngleList(node.typeArguments);
		}

		// `x as Foo` / `x satisfies Foo` — keep the expression, drop the rest.
		if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
			cuts.push({ start: node.expression.end, end: node.end });
		}

		// `x!` non-null assertion.
		if (ts.isNonNullExpression(node)) {
			cuts.push({ start: node.expression.end, end: node.end });
		}

		ts.forEachChild(node, visit);
	};

	ts.forEachChild(sf, visit);
	return cuts;
}

/**
 * Grow a cut to swallow its whole line when nothing but whitespace would be
 * left behind — so a deleted `import type` line doesn't leave a blank one.
 */
function expandToWholeLines(text: string, cut: Cut): Cut {
	const lineStart = text.lastIndexOf('\n', cut.start - 1) + 1;
	let lineEnd = text.indexOf('\n', cut.end);
	if (lineEnd === -1) lineEnd = text.length;

	const before = text.slice(lineStart, cut.start);
	const after = text.slice(cut.end, lineEnd);
	if (before.trim() === '' && after.trim() === '') {
		// Include the newline itself so the line disappears completely.
		return { start: lineStart, end: Math.min(lineEnd + 1, text.length) };
	}
	return cut;
}

function applyCuts(text: string, cuts: Cut[]): string {
	const expanded = cuts.map((c) => expandToWholeLines(text, c));

	// Widest-first at each offset, so a container is seen before anything it
	// encloses.
	expanded.sort((a, b) => a.start - b.start || b.end - a.end);

	// Drop cuts contained in a wider one. AST ranges nest cleanly, so a partial
	// overlap means the cut logic is wrong — bail rather than emit garbage.
	const kept: Cut[] = [];
	let maxEnd = -1;
	for (const cut of expanded) {
		if (cut.start >= maxEnd) {
			kept.push(cut);
			maxEnd = cut.end;
		} else if (cut.end > maxEnd) {
			throw new Unsupported('overlapping cuts');
		}
	}

	// Splice from the end so earlier offsets stay valid.
	let out = text;
	for (let i = kept.length - 1; i >= 0; i--) {
		const { start, end } = kept[i]!;
		out = out.slice(0, start) + out.slice(end);
	}
	return out;
}

/** Does this source parse cleanly? Guards both input and output. */
function parsesCleanly(text: string, kind: ts.ScriptKind): boolean {
	const sf = ts.createSourceFile('snippet', text, ts.ScriptTarget.Latest, true, kind);
	// `parseDiagnostics` isn't in the public typings but is a stable part of
	// the SourceFile shape; it's the only way to get syntax errors without
	// standing up a full Program.
	const diagnostics = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] })
		.parseDiagnostics;
	return !diagnostics || diagnostics.length === 0;
}

/**
 * Strip type syntax from a TypeScript snippet.
 *
 * Returns `null` when the snippet can't be converted safely, or when there was
 * no TypeScript in it to begin with (no point offering an identical tab).
 */
export function stripTypes(source: string): string | null {
	if (!parsesCleanly(source, ts.ScriptKind.TS)) return null;

	const sf = ts.createSourceFile(
		'snippet.ts',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS
	);

	let out: string;
	try {
		const cuts = collectCuts(sf, source);
		if (cuts.length === 0) return null;
		out = applyCuts(source, cuts);
	} catch (err) {
		if (err instanceof Unsupported) return null;
		throw err;
	}
	if (out === source) return null;

	// Safety net: a bug in the cut logic degrades to "no JS tab" rather than
	// showing readers code that doesn't run.
	if (!parsesCleanly(out, ts.ScriptKind.JS)) return null;

	return out;
}

/** Matches a Svelte `<script>` block, capturing its attributes and body. */
const SCRIPT_BLOCK = /<script([^>]*)>([\s\S]*?)<\/script>/g;

/**
 * Strip types from every `<script lang="ts">` block in a Svelte snippet,
 * leaving markup untouched.
 */
export function svelteToJs(source: string): string | null {
	let changed = false;
	let failed = false;

	const out = source.replace(SCRIPT_BLOCK, (match, attrs: string, body: string) => {
		if (!/lang\s*=\s*["']ts["']/.test(attrs)) return match;

		const js = stripTypes(body);
		// A `lang="ts"` block with no actual types still needs the attribute
		// dropped, so fall back to the original body rather than failing.
		const nextBody = js ?? body;
		if (js === null && !parsesCleanly(body, ts.ScriptKind.TS)) {
			failed = true;
			return match;
		}

		const nextAttrs = attrs.replace(/\s*lang\s*=\s*["']ts["']/, '');
		changed = true;
		return `<script${nextAttrs}>${nextBody}</script>`;
	});

	if (failed || !changed) return null;
	return out;
}

/**
 * Produce the JavaScript variant of a docs code block, or `null` if this block
 * shouldn't get a JS/TS toggle.
 */
export function toJavaScript(source: string, lang: string): string | null {
	if (lang === 'svelte') return svelteToJs(source);
	if (lang === 'ts' || lang === 'typescript') return stripTypes(source);
	return null;
}
