/**
 * CodeBlock tests — three layers, all assertion-based (non-zero exit on failure):
 *
 *  1. Registry   — the language list really is CodeMirror's, in sync, and
 *                  every entry in the <Select> loads a real parser.
 *  2. Content    — html/markdown round trips of awkward code, incl. no drift.
 *  3. Editor     — a REAL Tiptap editor (ProseMirror) running the REAL
 *                  CodeMirror NodeView under happy-dom: both sync
 *                  directions, no echo loops, language/theme/readOnly,
 *                  arrow-key escape. (The React header can't mount without
 *                  an EditorContent, so its handlers are exercised through
 *                  the NodeView's own `headerProps()`; the header UI itself
 *                  is covered in smoke-test-codeblock-ui.ts.)
 *
 * What this cannot cover: real browser focus/IME/pointer behavior and
 * actual rendering. See the README's known limitations.
 */
import { execSync } from "node:child_process";
import { Window } from "happy-dom";

// ---------------------------------------------------------------- harness
const win = new Window();
const g: any = global;
g.window = win;
g.document = win.document;
Object.defineProperty(global, "navigator", { value: win.navigator, configurable: true });
for (const k of [
  "HTMLElement", "SVGElement", "Element", "ShadowRoot", "Node", "customElements", "CustomEvent", "Event",
  "InputEvent", "MutationObserver", "DocumentFragment", "CSSStyleSheet", "HTMLTemplateElement",
  "KeyboardEvent", "MouseEvent", "UIEvent", "FocusEvent", "Range", "Selection", "DOMParser",
]) if ((win as any)[k] !== undefined) g[k] = (win as any)[k];
g.getComputedStyle = win.getComputedStyle.bind(win);
g.ResizeObserver = (win as any).ResizeObserver;
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);

// Controllable prefers-color-scheme, to test "system" theme live-following.
// Listeners are tracked per query: CodeMirror registers its own `print`
// listener through matchMedia, and delivering our fake dark-mode change to
// *that* crashes it (an earlier version of this stub did exactly that).
const DARK_QUERY = "(prefers-color-scheme: dark)";
let systemDark = false;
const mqListeners = new Set<(e: { type: string; matches: boolean }) => void>(); // dark-scheme listeners only
(win as any).matchMedia = g.matchMedia = (query: string) => ({
  media: query,
  get matches() { return query === DARK_QUERY ? systemDark : false; },
  addEventListener: (_: string, cb: any) => { if (query === DARK_QUERY) mqListeners.add(cb); },
  removeEventListener: (_: string, cb: any) => { if (query === DARK_QUERY) mqListeners.delete(cb); },
});
const setSystemDark = (v: boolean) => {
  systemDark = v;
  [...mqListeners].forEach((cb) => cb({ type: "change", matches: v }));
};

let failures = 0;
const expect = (cond: unknown, msg: string) => {
  console.log(`${cond ? "✔" : "✗"} ${msg}`);
  if (!cond) failures += 1;
};
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (cond: () => boolean, label: string, timeout = 8000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for: ${label}`);
    await settle(20);
  }
};

const { Editor } = await import("@tiptap/core");
const { TextSelection } = await import("@tiptap/pm/state");
const { language: languageFacet } = await import("@codemirror/language");
const { EditorView: CMView } = await import("@codemirror/view");
const { createCoreExtensions } = await import("../src/editor/extensions/core");
const { mergeExtensions } = await import("../src/editor/extensions/merge");
const { createCodeBlockEditorExtensions } = await import("../src/nodes/CodeBlock/editor/extensions");
const { CodeBlockView } = await import("../src/nodes/CodeBlock/editor/CodeBlockView");
const { parseContent } = await import("../src/editor/content/parse");
const { serializeContent } = await import("../src/editor/content/serialize");
const { CODE_LANGUAGES, EXTRA_ALIASES, resolveCodeLanguage } = await import("../src/nodes/CodeBlock/languages");
const { loadCodeLanguage } = await import("../src/nodes/CodeBlock/shared/language-loader");

// ============================================================ 1. registry
console.log("\n--- 1. language registry ---");
try {
  execSync("node scripts/generate-code-languages.mjs --check", { stdio: "pipe" });
  expect(true, "committed registry matches @codemirror/language-data (regenerated in memory)");
} catch (e: any) {
  expect(false, `registry is stale: ${String(e.stderr ?? e.message).trim()}`);
}
{
  const { languages } = await import("@codemirror/language-data");
  expect(CODE_LANGUAGES.length === languages.length + 1, `Select offers every CodeMirror language + Plain text (${CODE_LANGUAGES.length} = ${languages.length} + 1)`);
}
expect(CODE_LANGUAGES[0].id === "plaintext" && CODE_LANGUAGES[0].label === "Plain text", "Plain text is first and is the default id 'plaintext'");
expect(new Set(CODE_LANGUAGES.map((l) => l.id)).size === CODE_LANGUAGES.length, "language ids are unique");
expect(resolveCodeLanguage(null)?.id === "plaintext" && resolveCodeLanguage("")?.id === "plaintext", "null / empty language resolves to plaintext");
expect(resolveCodeLanguage("js")?.id === "javascript" && resolveCodeLanguage("JS")?.id === "javascript", "alias 'js' (any case) resolves to javascript");
expect(resolveCodeLanguage("language-python")?.id === "python", "leftover 'language-' prefix is tolerated");
expect(resolveCodeLanguage("typescriptreact")?.id === "tsx", "VS Code's 'typescriptreact' resolves to tsx");
expect(resolveCodeLanguage("definitely-not-a-language") === null, "unknown names resolve to null (not fuzzy-matched onto a real language)");
{
  const bad = Object.entries(EXTRA_ALIASES).filter(([, target]) => !CODE_LANGUAGES.some((l) => l.id === target));
  expect(bad.length === 0, `every extra alias targets a real language${bad.length ? ` — broken: ${JSON.stringify(bad)}` : ""}`);
}
{
  const t0 = Date.now();
  const failed: string[] = [];
  for (const lang of CODE_LANGUAGES.slice(1)) {
    try { if (!(await loadCodeLanguage(lang.id))) failed.push(lang.id); } catch { failed.push(lang.id); }
  }
  expect(failed.length === 0, `all ${CODE_LANGUAGES.length - 1} languages in the Select load a real parser (${Date.now() - t0}ms)${failed.length ? ` — failed: ${failed.join(", ")}` : ""}`);
}

// ============================================================= 2. content
console.log("\n--- 2. content round trips ---");
const coreExt = createCoreExtensions();
const cb = (language: string | undefined, text: string) => ({
  type: "codeBlock", attrs: language === undefined ? {} : { language }, content: text ? [{ type: "text", text }] : undefined,
});
const cases: Array<[string, any]> = [
  ["plain", cb("plaintext", "hello\nworld")],
  ["default language (no attr)", cb(undefined, "x")],
  ["javascript", cb("javascript", "const a = 1;\nconsole.log(a)")],
  ["indentation + blank lines + trailing newline", cb("python", "def f():\n    if x:\n\n        return 1\n")],
  ["contains a ``` fence line", cb("markdown", "```js\nlet a\n```")],
  ["contains a ```` run", cb("plaintext", "a ```` b")],
  ["empty", cb("plaintext", "")],
  ["leading blank line", cb("plaintext", "\nfirst blank")],
  ["html-looking content", cb("html", '<div class="a">&amp; <b>x</b></div>')],
  ["id with symbols (c++)", cb("c++", "int main() {}")],
];
for (const fmt of ["markdown", "html"] as const) {
  for (const [name, node] of cases) {
    const doc: any = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "before" }] }, node, { type: "paragraph", content: [{ type: "text", text: "after" }] }] };
    const out = serializeContent(doc, fmt, coreExt) as string;
    const back: any = parseContent(out, fmt, coreExt);
    const got = back.content.find((n: any) => n.type === "codeBlock");
    const gotText = (got?.content ?? []).map((t: any) => t.text).join("");
    const wantText = (node.content ?? []).map((t: any) => t.text).join("");
    const wantLang = node.attrs.language ?? "plaintext";
    expect(
      got && gotText === wantText && got.attrs.language === wantLang && back.content.length === 3,
      `[${fmt}] ${name}${got ? "" : " (block lost)"}${got && gotText !== wantText ? `\n    want ${JSON.stringify(wantText)}\n    got  ${JSON.stringify(gotText)}` : ""}${got && got.attrs.language !== wantLang ? `\n    language want ${wantLang} got ${got.attrs.language}` : ""}`,
    );
  }
}
{
  // Drift: the bug where every markdown round trip added one "\n".
  const start: any = { type: "doc", content: [cb("python", "a\n\n  b\n")] };
  let cur: any = start;
  for (let i = 0; i < 5; i++) cur = parseContent(serializeContent(cur, "markdown", coreExt) as string, "markdown", coreExt);
  expect(JSON.stringify(cur) === JSON.stringify(start), "5 consecutive markdown round trips are byte-stable (no growing trailing newline)");
  const plain = serializeContent({ type: "doc", content: [cb("plaintext", "x")] } as any, "markdown", coreExt) as string;
  expect(plain === "```\nx\n```\n", `a plain block serializes as a bare fence, not \`\`\`plaintext (got ${JSON.stringify(plain)})`);
  const aliased: any = parseContent("```js\nlet a\n```", "markdown", coreExt);
  expect(aliased.content[0].attrs.language === "js", "a fence tagged `js` keeps the author's `js` (not silently rewritten)");
}

// ============================================================== 3. editor
console.log("\n--- 3. editor: real ProseMirror + real CodeMirror ---");
const host = win.document.createElement("div");
win.document.body.appendChild(host as any);
const editor = new Editor({
  element: host as any,
  extensions: mergeExtensions(createCoreExtensions(), createCodeBlockEditorExtensions()),
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "intro" }] },
      { type: "codeBlock", attrs: { language: "javascript" }, content: [{ type: "text", text: "const a = 1;" }] },
      { type: "paragraph", content: [{ type: "text", text: "outro" }] },
    ],
  },
});
await settle(60);

const blockPos = () => { let p = -1; editor.state.doc.forEach((n, off) => { if (n.type.name === "codeBlock") p = off; }); return p; };
const blockText = () => editor.state.doc.nodeAt(blockPos())!.textContent;
const cmEl: any = host.querySelector(".cm-editor");
const cm: any = CMView.findFromDOM(cmEl);
const nodeView: any = (editor.view as any).docView.children.find((c: any) => c.node?.type.name === "codeBlock").spec;
let txCount = 0;
editor.on("transaction", () => { txCount += 1; });

expect(!!cm && cm.state.doc.toString() === "const a = 1;", "CodeMirror is mounted with the node's text");
expect(!!host.querySelector(".cm-lineNumbers"), "line-number gutter is present");
expect(!host.querySelector('[class*="codeBlock"] pre') && host.querySelectorAll(".rte-codeblock").length === 1, "exactly one code block frame, no leftover plain <pre>");
await waitFor(() => languageFacet && cm.state.facet(languageFacet)?.name === "javascript", "javascript language to load");
expect(cm.state.facet(languageFacet).name === "javascript", "the stored language ('javascript') is applied to CodeMirror (lazily loaded)");

// --- CodeMirror -> ProseMirror
cm.focus();
await settle();
expect(cm.hasFocus, "CodeMirror can take focus (precondition for forwarding user edits)");
txCount = 0;
cm.dispatch({ changes: { from: 0, insert: "X" }, selection: { anchor: 1 } });
expect(blockText() === "Xconst a = 1;", `typing in CodeMirror updates the ProseMirror node (got ${JSON.stringify(blockText())})`);
expect(cm.state.doc.toString() === "Xconst a = 1;", "…and CodeMirror's own text is not doubled by an echo");
expect(txCount === 1, `…using exactly one ProseMirror transaction (got ${txCount})`);

// --- ProseMirror -> CodeMirror
txCount = 0;
editor.view.dispatch(editor.state.tr.insertText("Y", blockPos() + 1 + 3));
expect(cm.state.doc.toString() === "XcoYnst a = 1;", `a ProseMirror edit inside the node reaches CodeMirror (got ${JSON.stringify(cm.state.doc.toString())})`);
expect(blockText() === "XcoYnst a = 1;" && txCount === 1, `…without echoing back (ProseMirror text unchanged, ${txCount} transaction)`);
const sameView = host.querySelector(".cm-editor") === cmEl && CMView.findFromDOM(cmEl) === cm;
expect(sameView, "the same CodeMirror instance survives transactions (never recreated, so no cursor loss)");

// undo goes through ProseMirror history -> CodeMirror follows
editor.commands.undo();
await settle();
expect(cm.state.doc.toString() === blockText(), `undo (ProseMirror history) is reflected in CodeMirror (${JSON.stringify(cm.state.doc.toString())})`);

// --- language (persisted)
txCount = 0;
nodeView.headerProps().onLanguageChange("python");
expect(editor.getJSON().content![1].attrs!.language === "python", "choosing a language in the header persists it on the node");
await waitFor(() => cm.state.facet(languageFacet)?.name === "python", "python language to load");
expect(cm.state.facet(languageFacet).name === "python", "CodeMirror switches to the new language");
expect(nodeView.headerProps().language === "python", "the header reflects the new language");
nodeView.headerProps().onLanguageChange("plaintext");
await waitFor(() => !cm.state.facet(languageFacet), "plaintext to remove the language");
expect(!cm.state.facet(languageFacet), "choosing Plain text removes highlighting");
{
  // A stale load must not overwrite a newer choice. With the real loader
  // everything is cached and resolves in request order, so provoke the race
  // deliberately: make the FIRST request (rust) resolve LATER than the
  // second (go).
  const realLoad = CodeBlockView.loadLanguage;
  CodeBlockView.loadLanguage = (id) =>
    id === "rust" ? new Promise((r) => setTimeout(r, 150)).then(() => realLoad(id)) : realLoad(id);
  try {
    nodeView.headerProps().onLanguageChange("rust");
    nodeView.headerProps().onLanguageChange("go");
    await waitFor(() => cm.state.facet(languageFacet)?.name === "go", "go to apply");
    await settle(400); // long enough for the slow, stale 'rust' load to land
    expect(cm.state.facet(languageFacet)?.name === "go", "a slow, stale language load can't overwrite the newer choice");
  } finally {
    CodeBlockView.loadLanguage = realLoad;
  }
}

// --- theme (runtime only)
const frame: any = host.querySelector(".rte-codeblock");
expect(frame.classList.contains("rte-codeblock--light") && !frame.classList.contains("rte-codeblock--dark"), "default theme 'system' resolves to light when the OS is light");
setSystemDark(true);
expect(frame.classList.contains("rte-codeblock--dark"), "'system' follows the OS live: OS goes dark -> block goes dark");
setSystemDark(false);
expect(frame.classList.contains("rte-codeblock--light"), "…and back to light");
nodeView.headerProps().onThemeChange("dark");
setSystemDark(false);
expect(frame.classList.contains("rte-codeblock--dark"), "explicit 'dark' ignores the OS");
nodeView.headerProps().onThemeChange("light");
setSystemDark(true);
expect(frame.classList.contains("rte-codeblock--light"), "explicit 'light' ignores the OS");
expect(nodeView.headerProps().theme === "light", "the header reflects the chosen theme");
setSystemDark(false);
expect(mqListeners.size === 0, "an explicit theme stops listening to the OS preference (no leaked listener)");
nodeView.headerProps().onThemeChange("system");
expect(mqListeners.size === 1, "switching back to 'system' listens again");
expect(!/theme|dark|light/i.test(JSON.stringify(editor.getJSON())), "theme never appears in the document JSON (runtime-only)");
expect(!/theme|dark|light/i.test(editor.getHTML()), "…nor in the HTML");

// --- an UNFOCUSED CodeMirror must not steal ProseMirror's selection
{
  (win.document.activeElement as any)?.blur?.();
  const outro = editor.state.doc.content.size - 1; // inside the last paragraph
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, outro)));
  const selBefore = editor.state.selection.from;
  expect(!cm.hasFocus, "(setup) CodeMirror is not focused");
  cm.dispatch({ selection: { anchor: 1 } }); // e.g. a CodeMirror-side update while the user is elsewhere
  expect(editor.state.selection.from === selBefore, "an update to an unfocused CodeMirror does not drag ProseMirror's selection into the block");
}

// --- copy source
expect(nodeView.headerProps().getCode() === cm.state.doc.toString(), "the copy button reads CodeMirror's current text");

// --- readOnly
editor.setEditable(false);
await settle();
expect(cm.state.readOnly === true && cm.contentDOM.getAttribute("contenteditable") === "false", "readOnly editor locks CodeMirror");
expect(nodeView.headerProps().editable === false, "…and tells the header (language Select disabled)");
nodeView.headerProps().onLanguageChange("ruby");
expect(editor.getJSON().content![1].attrs!.language !== "ruby", "…and a locked editor refuses a language change");
editor.setEditable(true);
await settle();
expect(cm.state.readOnly === false && cm.contentDOM.getAttribute("contenteditable") === "true", "unlocking restores editing");

// --- ProseMirror moves selection into the block (arrowing in from outside)
txCount = 0;
nodeView.setSelection(2, 4);
expect(cm.state.selection.main.from === 2 && cm.state.selection.main.to === 4, "ProseMirror placing its selection in the block moves CodeMirror's selection");
expect(txCount === 0, "…without producing a transaction (no feedback)");

// --- arrow keys escape at the edges
// Browser-faithful: real keydown events carry `keyCode`, and CodeMirror resolves
// Ctrl/Alt/Meta+letter bindings (including Shift-Mod-z) through it — an event
// without one silently matches a different binding (an earlier version of this
// test "pressed redo" and got undo twice).
const KEYCODES: Record<string, number> = { Tab: 9, Enter: 13, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Backspace: 8, z: 90 };
const key = (k: string, init: any = {}) => {
  const shifted = init.shiftKey && k.length === 1 ? k.toUpperCase() : k; // browsers send "Z" for Shift+z
  return cm.contentDOM.dispatchEvent(new (win as any).KeyboardEvent("keydown", { key: shifted, keyCode: KEYCODES[k], bubbles: true, cancelable: true, ...init }));
};
cm.focus();
cm.dispatch({ selection: { anchor: cm.state.doc.length } });
key("ArrowDown");
{
  const { $from } = editor.state.selection;
  expect($from.parent.type.name === "paragraph" && $from.parent.textContent === "outro", `ArrowDown at the end leaves the block into the next paragraph (now in ${$from.parent.type.name} "${$from.parent.textContent}")`);
}
cm.focus();
cm.dispatch({ selection: { anchor: 0 } });
key("ArrowUp");
{
  const { $from } = editor.state.selection;
  expect($from.parent.type.name === "paragraph" && $from.parent.textContent === "intro", `ArrowUp at the start leaves the block into the previous paragraph (now in ${$from.parent.type.name} "${$from.parent.textContent}")`);
}
// Mid-block: on the FIRST line of a multi-line block, ArrowDown belongs to
// CodeMirror and must not leave the block.
cm.focus();
cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "l1\nl2" }, selection: { anchor: 1 } });
expect(blockText() === "l1\nl2", "(setup) two-line block");
key("ArrowDown");
expect(editor.state.selection.$from.parent.type.name === "codeBlock", "ArrowDown on the first line of a multi-line block does NOT leave the block");
cm.dispatch({ selection: { anchor: 4 } }); // end of "l2"? doc is "l1\nl2" (5 chars) -> clamp below
cm.dispatch({ selection: { anchor: cm.state.doc.length } });
key("ArrowLeft"); // mid-line move: not at doc start
expect(editor.state.selection.$from.parent.type.name === "codeBlock", "ArrowLeft away from the block start stays inside");

// --- Tab / Shift-Tab, Mod-Z / Mod-Shift-Z, Mod-Enter (the keys the README documents)
// PM history merges edits made within ~500ms into one undo step, so space
// the steps out to keep each one separately undoable.
cm.focus();
cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: "abc" }, selection: { anchor: 0 } });
expect(blockText() === "abc", "(setup) block is 'abc', cursor at start");
await settle(650);
key("Tab");
expect(cm.state.doc.toString() === "  abc" && blockText() === "  abc", `Tab indents by the 2-space unit (CM ${JSON.stringify(cm.state.doc.toString())}, PM ${JSON.stringify(blockText())})`);
await settle(650);
key("z", { ctrlKey: true });
await settle();
expect(blockText() === "abc" && cm.state.doc.toString() === "abc", `Mod-Z undoes through ProseMirror's history and CodeMirror follows (PM ${JSON.stringify(blockText())}, CM ${JSON.stringify(cm.state.doc.toString())})`);
key("z", { ctrlKey: true, shiftKey: true });
await settle();
expect(blockText() === "  abc" && cm.state.doc.toString() === "  abc", `Mod-Shift-Z redoes (PM ${JSON.stringify(blockText())}, CM ${JSON.stringify(cm.state.doc.toString())})`);
await settle(650);
cm.focus();
cm.dispatch({ selection: { anchor: 2 } });
key("Tab", { shiftKey: true });
expect(blockText() === "abc", `Shift-Tab unindents (PM ${JSON.stringify(blockText())})`);

cm.focus();
cm.dispatch({ selection: { anchor: 1 } });
const kidsBefore = editor.state.doc.childCount;
key("Enter", { ctrlKey: true });
{
  const { $from } = editor.state.selection;
  expect(
    editor.state.doc.childCount === kidsBefore + 1 && $from.parent.type.name === "paragraph" && $from.parent.textContent === "",
    `Mod-Enter exits the block into a NEW empty paragraph (children ${kidsBefore} -> ${editor.state.doc.childCount}, now in ${$from.parent.type.name})`,
  );
  expect(blockText() === "abc", "…and the block's code is untouched");
}

// --- Backspace in an empty block -> paragraph
nodeView.headerProps().onLanguageChange("plaintext");
cm.focus();
cm.dispatch({ changes: { from: 0, to: cm.state.doc.length } });
expect(blockText() === "", "(setup) block emptied");
key("Backspace");
expect(blockPos() === -1 && editor.state.doc.childCount === kidsBefore + 1 && editor.state.doc.child(1).type.name === "paragraph", "Backspace in an empty code block turns it back into a paragraph");
expect(host.querySelectorAll(".rte-codeblock").length === 0, "…and the CodeMirror NodeView is torn down");

// --- destroy
editor.destroy();
expect(host.querySelectorAll(".cm-editor").length === 0, "destroying the editor leaves no CodeMirror behind");

console.log(failures ? `\n✗ ${failures} assertion(s) failed` : "\n✔ CodeBlock registry, content, and editor integration all behave correctly");
process.exit(failures ? 1 : 0);
