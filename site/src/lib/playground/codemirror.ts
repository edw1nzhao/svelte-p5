import { EditorState, Prec } from '@codemirror/state';
import {
	EditorView,
	drawSelection,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
	bracketMatching,
	HighlightStyle,
	indentOnInput,
	indentUnit,
	syntaxHighlighting
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';

export interface EditorOptions {
	parent: HTMLElement;
	doc: string;
	label: string;
	describedBy?: string;
	onChange: (doc: string) => void;
	onRun: () => void;
}

const theme = EditorView.theme({
	'&': {
		height: '100%',
		fontSize: '0.875rem',
		backgroundColor: 'var(--color-page)',
		color: 'var(--color-fg)'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
	'.cm-gutters': {
		backgroundColor: 'var(--color-panel)',
		color: 'var(--color-fg-subtle)',
		borderRight: '1px solid var(--color-line)'
	},
	'.cm-activeLine': { backgroundColor: 'rgb(99 102 241 / 0.05)' },
	'.cm-activeLineGutter': {
		backgroundColor: 'rgb(99 102 241 / 0.1)',
		color: 'var(--color-fg-secondary)'
	},
	'.cm-content': { caretColor: 'var(--color-brand-strong)' },
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
		backgroundColor: 'rgb(99 102 241 / 0.25)'
	}
});

// CodeMirror's defaultHighlightStyle, with colours read from CSS so the page theme can swap them.
const highlight = HighlightStyle.define([
	{ tag: tags.meta, color: 'var(--cm-meta)' },
	{ tag: tags.link, textDecoration: 'underline' },
	{ tag: tags.heading, textDecoration: 'underline', fontWeight: 'bold' },
	{ tag: tags.emphasis, fontStyle: 'italic' },
	{ tag: tags.strong, fontWeight: 'bold' },
	{ tag: tags.strikethrough, textDecoration: 'line-through' },
	{ tag: tags.keyword, color: 'var(--cm-keyword)' },
	{
		tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
		color: 'var(--cm-atom)'
	},
	{ tag: [tags.literal, tags.inserted], color: 'var(--cm-literal)' },
	{ tag: [tags.string, tags.deleted], color: 'var(--cm-string)' },
	{ tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: 'var(--cm-regexp)' },
	{ tag: tags.definition(tags.variableName), color: 'var(--cm-definition)' },
	{ tag: tags.local(tags.variableName), color: 'var(--cm-local)' },
	{ tag: [tags.typeName, tags.namespace], color: 'var(--cm-type)' },
	{ tag: tags.className, color: 'var(--cm-class)' },
	{ tag: [tags.special(tags.variableName), tags.macroName], color: 'var(--cm-special)' },
	{ tag: tags.definition(tags.propertyName), color: 'var(--cm-property)' },
	{ tag: tags.comment, color: 'var(--cm-comment)' },
	{ tag: tags.invalid, color: 'var(--cm-invalid)' }
]);

export function createEditor(options: EditorOptions): EditorView {
	const run = () => {
		options.onRun();
		return true;
	};
	const attrs: Record<string, string> = { 'aria-label': options.label, tabindex: '0' };
	if (options.describedBy) attrs['aria-describedby'] = options.describedBy;

	return new EditorView({
		parent: options.parent,
		state: EditorState.create({
			doc: options.doc,
			extensions: [
				Prec.highest(keymap.of([{ key: 'Mod-Enter', run }])),
				lineNumbers(),
				highlightActiveLineGutter(),
				history(),
				drawSelection(),
				indentOnInput(),
				indentUnit.of('  '),
				bracketMatching(),
				closeBrackets(),
				highlightActiveLine(),
				syntaxHighlighting(highlight),
				javascript(),
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
				EditorView.contentAttributes.of(attrs),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) options.onChange(update.state.doc.toString());
				}),
				theme
			]
		})
	});
}

export function replaceDoc(view: EditorView, doc: string): void {
	view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
}
