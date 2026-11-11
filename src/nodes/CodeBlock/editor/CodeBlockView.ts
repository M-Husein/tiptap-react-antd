import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView as CMView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type Command,
  type ViewUpdate,
} from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import type { Editor } from "@tiptap/core";
import { exitCode } from "@tiptap/pm/commands";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";
import type { NodeView } from "@tiptap/pm/view";
import { ReactRenderer } from "@tiptap/react";
import { CodeBlockHeader, type CodeBlockHeaderProps } from "../shared/CodeBlockHeader";
import { loadCodeLanguage } from "../shared/language-loader";
import { resolveTheme, subscribeSystemTheme } from "../shared/theme";
import type { CodeBlockTheme } from "../types";

export interface CodeBlockViewOptions {
  node: PMNode;
  editor: Editor;
  getPos: () => number | undefined;
  defaultTheme: CodeBlockTheme;
}

/** Smallest single replacement turning `oldVal` into `newVal`, or null if equal. */
export const computeChange = (oldVal: string, newVal: string) => {
  if (oldVal === newVal) return null;
  let start = 0;
  let oldEnd = oldVal.length;
  let newEnd = newVal.length;
  while (start < oldEnd && oldVal.charCodeAt(start) === newVal.charCodeAt(start)) start += 1;
  while (oldEnd > start && newEnd > start && oldVal.charCodeAt(oldEnd - 1) === newVal.charCodeAt(newEnd - 1)) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  return { from: start, to: oldEnd, text: newVal.slice(start, newEnd) };
};

const editableExtension = (editable: boolean): Extension => [
  EditorState.readOnly.of(!editable),
  CMView.editable.of(editable),
];

/**
 * Colors come from CSS custom properties set by `.rte-codeblock--light` /
 * `--dark` (content.css), and syntax colors from the shared `tok-*`
 * classes — the same stylesheet the Viewer uses — so switching theme is a
 * class change on `dom`, not a CodeMirror reconfigure, and the two
 * can't drift apart (spec 8.1).
 */
const cmTheme = CMView.theme({
  "&": { color: "var(--rte-code-fg)", backgroundColor: "transparent", fontSize: "var(--rte-code-font-size)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--rte-code-font)", lineHeight: "var(--rte-code-line-height)" },
  ".cm-content": { caretColor: "var(--rte-code-caret)", padding: "var(--rte-code-pad-y) 0" },
  // 2px (not CodeMirror's default 1.2px): Chrome's compositor doesn't
  // rasterize the thin, sub-pixel border-only caret when it sits alone on
  // an *empty* line, so the caret vanished on every blank line (and on the
  // new line made by Enter). A 2px border paints reliably; `margin-left`
  // keeps it centred on the caret position.
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--rte-code-caret)",
    borderLeftWidth: "2px",
    marginLeft: "-1px",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "var(--rte-code-selection)" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--rte-code-gutter-fg)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px", minWidth: "3ch", boxSizing: "content-box" },
  ".cm-activeLine": { backgroundColor: "var(--rte-code-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--rte-code-active-line)", color: "var(--rte-code-gutter-active-fg)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "var(--rte-code-selection)", outline: "none" },
  "&.cm-focused .cm-nonmatchingBracket": { color: "var(--rte-code-invalid)" },
});

/**
 * ProseMirror NodeView hosting a CodeMirror 6 editor for one code block
 * (spec section 24). One `CMView` lives for the NodeView's whole life and
 * is never recreated on a ProseMirror transaction (24.17); changes are
 * forwarded in both directions and `updating` stops them echoing back.
 *
 * This is a plain ProseMirror NodeView rather than `ReactNodeViewRenderer`
 * on purpose: Tiptap's React NodeView gives non-leaf nodes a detached
 * content element and no `setSelection` hook, and a nested editor needs
 * the latter (arrowing into the block from outside must focus
 * CodeMirror). Only the header is React, via Tiptap's `ReactRenderer`,
 * which portals into the app's own React tree — so antd's ConfigProvider
 * (theme, locale) still applies to the Selects.
 *
 * Document vs runtime (spec 24.16): `language` lives on the node and is
 * changed with a ProseMirror transaction; `theme` is only ever a field
 * on this object.
 */
export class CodeBlockView implements NodeView {
  /**
   * How a language string becomes a CodeMirror extension. A static seam,
   * not public API: tests swap it for a deliberately slow loader to prove a
   * stale (earlier, slower) load can't overwrite a newer choice — with the
   * real loader everything resolves in request order, so that race can't
   * otherwise be provoked.
   */
  static loadLanguage: typeof loadCodeLanguage = loadCodeLanguage;

  readonly dom: HTMLElement;
  readonly cm: CMView;

  private node: PMNode;
  private readonly editor: Editor;
  private readonly getPos: () => number | undefined;
  private theme: CodeBlockTheme;
  private updating = false;
  private destroyed = false;
  private languageRequest = 0;
  private lastEditable: boolean;
  private unsubscribeSystemTheme: (() => void) | null = null;
  private readonly header: ReactRenderer<unknown, CodeBlockHeaderProps>;

  private readonly languageCompartment = new Compartment();
  private readonly darkCompartment = new Compartment();
  private readonly editableCompartment = new Compartment();

  constructor({ node, editor, getPos, defaultTheme }: CodeBlockViewOptions) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;
    this.theme = defaultTheme;
    this.lastEditable = editor.isEditable;

    this.dom = document.createElement("div");
    this.dom.className = "rte-codeblock";
    this.dom.setAttribute("data-rte-codeblock", "");

    this.header = new ReactRenderer(CodeBlockHeader, {
      editor,
      props: this.headerProps(),
      as: "div",
      className: "rte-codeblock__header-host",
    });
    this.dom.appendChild(this.header.element);

    const host = document.createElement("div");
    host.className = "rte-codeblock__editor";
    this.dom.appendChild(host);

    this.cm = new CMView({
      parent: host,
      state: EditorState.create({ doc: node.textContent, extensions: this.cmExtensions() }),
    });

    this.applyTheme();
    this.applyLanguage();
    editor.on("update", this.onEditorUpdate);
  }

  // ---------------------------------------------------------------- header

  private headerProps(): CodeBlockHeaderProps {
    return {
      language: String(this.node.attrs.language ?? "plaintext"),
      theme: this.theme,
      editable: this.editor.isEditable,
      getCode: () => this.cm.state.doc.toString(),
      onThemeChange: this.setTheme,
      onLanguageChange: this.setLanguage,
    };
  }

  private renderHeader() {
    this.header.updateProps(this.headerProps());
  }

  /** Runtime only — never touches the document (RULE 15). */
  private readonly setTheme = (theme: CodeBlockTheme) => {
    this.theme = theme;
    this.applyTheme();
    this.renderHeader();
  };

  /** Persisted: a real ProseMirror transaction, so it's undoable and reaches onChange. */
  private readonly setLanguage = (language: string) => {
    const pos = this.getPos();
    if (typeof pos !== "number" || !this.editor.isEditable) return;
    const { view } = this.editor;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, language }));
    this.cm.focus();
  };

  // ------------------------------------------------------- theme / language

  private applyTheme() {
    this.unsubscribeSystemTheme?.();
    this.unsubscribeSystemTheme = null;

    const resolved = resolveTheme(this.theme);
    this.dom.classList.toggle("rte-codeblock--dark", resolved === "dark");
    this.dom.classList.toggle("rte-codeblock--light", resolved === "light");
    // Only CodeMirror's own built-in light/dark base rules (panels,
    // tooltips) need telling; our colors follow the class above.
    this.dispatchProgrammatic({
      effects: this.darkCompartment.reconfigure(CMView.darkTheme.of(resolved === "dark")),
    });

    if (this.theme === "system") {
      this.unsubscribeSystemTheme = subscribeSystemTheme(() => this.applyTheme());
    }
  }

  private applyLanguage() {
    const request = (this.languageRequest += 1);
    const language = String(this.node.attrs.language ?? "plaintext");
    CodeBlockView.loadLanguage(language)
      .then((support): Extension => support ?? [])
      .catch((): Extension => []) // a language that fails to load stays unhighlighted
      .then((extension) => {
        // Stale answer: the user switched again, or the block is gone.
        if (this.destroyed || request !== this.languageRequest) return;
        this.dispatchProgrammatic({ effects: this.languageCompartment.reconfigure(extension) });
      });
  }

  /** Dispatches to CodeMirror from our side, flagged so it isn't forwarded back to ProseMirror. */
  private dispatchProgrammatic(spec: Parameters<CMView["dispatch"]>[0]) {
    this.updating = true;
    try {
      this.cm.dispatch(spec);
    } finally {
      this.updating = false;
    }
  }

  // ------------------------------------------------------------ extensions

  private cmExtensions(): Extension[] {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(classHighlighter),
      EditorState.tabSize.of(2),
      indentUnit.of("  "),
      keymap.of([...this.editorKeymap(), ...closeBracketsKeymap, ...defaultKeymap, indentWithTab]),
      CMView.updateListener.of((update) => this.forwardUpdate(update)),
      CMView.contentAttributes.of({ "aria-label": "Code" }),
      cmTheme,
      this.languageCompartment.of([]),
      this.darkCompartment.of(CMView.darkTheme.of(false)),
      this.editableCompartment.of(editableExtension(this.editor.isEditable)),
    ];
  }

  private editorKeymap() {
    const undo: Command = () => this.editor.commands.undo();
    const redo: Command = () => this.editor.commands.redo();
    return [
      { key: "ArrowUp", run: this.maybeEscape("line", -1) },
      { key: "ArrowLeft", run: this.maybeEscape("char", -1) },
      { key: "ArrowDown", run: this.maybeEscape("line", 1) },
      { key: "ArrowRight", run: this.maybeEscape("char", 1) },
      {
        key: "Mod-Enter",
        run: () => {
          const { view } = this.editor;
          if (!exitCode(view.state, view.dispatch)) return false;
          view.focus();
          return true;
        },
      },
      { key: "Backspace", run: () => this.removeIfEmpty() },
      // History is ProseMirror's, not CodeMirror's — the document is the
      // source of truth, so undo must be one timeline across the whole editor.
      { key: "Mod-z", run: undo, preventDefault: true },
      { key: "Mod-y", mac: "Mod-Shift-z", run: redo, preventDefault: true },
      { key: "Shift-Mod-z", run: redo, preventDefault: true },
    ];
  }

  /** At the edge of the block, an arrow key leaves it instead of doing nothing. */
  private maybeEscape(unit: "char" | "line", dir: -1 | 1): Command {
    return (cm) => {
      const { state } = cm;
      let range: { from: number; to: number } = state.selection.main;
      if (!state.selection.main.empty) return false;
      if (unit === "line") range = state.doc.lineAt(range.from);
      if (dir < 0 ? range.from > 0 : range.to < state.doc.length) return false;

      const pos = this.getPos();
      if (typeof pos !== "number") return false;
      const { view } = this.editor;
      const target = pos + (dir < 0 ? 0 : this.node.nodeSize);
      const selection = Selection.near(view.state.doc.resolve(target), dir);
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
      view.focus();
      return true;
    };
  }

  /** Backspace in an empty block turns it back into a paragraph. */
  private removeIfEmpty(): boolean {
    if (this.cm.state.doc.length > 0 || !this.editor.isEditable) return false;
    const pos = this.getPos();
    if (typeof pos !== "number") return false;
    const { view } = this.editor;
    const tr = view.state.tr.setBlockType(pos, pos + this.node.nodeSize, view.state.schema.nodes.paragraph);
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)));
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  }

  // ------------------------------------------------ CodeMirror -> ProseMirror

  private forwardUpdate(update: ViewUpdate) {
    // `hasFocus`: only the user's own typing/selecting is forwarded.
    // Without it, reconfiguring the language/theme of an *unfocused*
    // block would drag ProseMirror's selection into it.
    if (this.updating || !this.cm.hasFocus) return;
    const pos = this.getPos();
    if (typeof pos !== "number") return;

    let offset = pos + 1;
    const { main } = update.state.selection;
    const selFrom = offset + main.from;
    const selTo = offset + main.to;
    const { view } = this.editor;
    const pmSel = view.state.selection;

    if (update.docChanged || pmSel.from !== selFrom || pmSel.to !== selTo) {
      const tr = view.state.tr;
      update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
        if (text.length) tr.replaceWith(offset + fromA, offset + toA, view.state.schema.text(text.toString()));
        else tr.delete(offset + fromA, offset + toA);
        offset += toB - fromB - (toA - fromA);
      });
      tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
      view.dispatch(tr);
    }
  }

  // ------------------------------------------------ ProseMirror -> CodeMirror

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    if (node === this.node) return true;

    const previousLanguage = this.node.attrs.language;
    this.node = node;

    const change = computeChange(this.cm.state.doc.toString(), node.textContent);
    if (change) {
      this.dispatchProgrammatic({
        changes: { from: change.from, to: change.to, insert: change.text },
      });
    }
    if (node.attrs.language !== previousLanguage) {
      this.applyLanguage();
      this.renderHeader();
    }
    return true;
  }

  private readonly onEditorUpdate = () => {
    const editable = this.editor.isEditable;
    if (editable === this.lastEditable) return;
    this.lastEditable = editable;
    this.dispatchProgrammatic({ effects: this.editableCompartment.reconfigure(editableExtension(editable)) });
    this.renderHeader();
  };

  // ------------------------------------------------- NodeView interface

  /** ProseMirror moved its selection into this block (e.g. arrowing in) -> focus CodeMirror there. */
  setSelection(anchor: number, head: number) {
    this.updating = true;
    try {
      this.cm.focus();
      this.cm.dispatch({ selection: { anchor, head } });
    } finally {
      this.updating = false;
    }
  }

  selectNode() {
    this.cm.focus();
  }

  /** CodeMirror and the header handle all of their own events. */
  stopEvent() {
    return true;
  }

  /** CodeMirror and React mutate this DOM; ProseMirror must not treat that as document edits. */
  ignoreMutation() {
    return true;
  }

  destroy() {
    this.destroyed = true;
    this.editor.off("update", this.onEditorUpdate);
    this.unsubscribeSystemTheme?.();
    this.cm.destroy();
    this.header.destroy();
  }
}
