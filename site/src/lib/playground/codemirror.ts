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
	defaultHighlightStyle,
	indentOnInput,
	indentUnit,
	syntaxHighlighting
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';

export interface EditorOptions {
	parent: HTMLElement;
	doc: string;
	label: string;
	describedBy?: string;
	onChange: (doc: string) => void;
	onRun: () => void;
}

const theme = EditorView.theme({
	'&': { height: '100%', fontSize: '0.875rem', backgroundColor: '#ffffff' },
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
	'.cm-gutters': { backgroundColor: '#f8fafc', color: '#64748b', borderRight: '1px solid #e2e8f0' },
	'.cm-activeLine': { backgroundColor: 'rgb(99 102 241 / 0.05)' },
	'.cm-activeLineGutter': { backgroundColor: 'rgb(99 102 241 / 0.1)', color: '#334155' },
	'.cm-content': { caretColor: '#4f46e5' }
});

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
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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
