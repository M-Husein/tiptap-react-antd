/**
 * CodeBlock UI tests: the Viewer's static block and the shared header
 * (antd Selects + Copy), driven through real DOM events — including
 * opening the real antd <Select> dropdown and choosing an option — rather
 * than calling handlers directly.
 *
 * Not covered (happy-dom isn't a browser): actual painting, the dropdown's
 * positioning, the clipboard permission prompt. See README known limitations.
 */
import type { Root } from "react-dom/client";
import * as React from "react";
import { act } from "react";
import { Window } from "happy-dom";

const win = new Window();
const g: any = global;
g.window = win;
g.document = win.document;
Object.defineProperty(global, "navigator", { value: win.navigator, configurable: true });
for (const k of [
  "HTMLElement", "SVGElement", "Element", "ShadowRoot", "Node", "customElements", "CustomEvent", "Event",
  "InputEvent", "MutationObserver", "DocumentFragment", "CSSStyleSheet", "KeyboardEvent", "MouseEvent",
  "UIEvent", "FocusEvent", "PointerEvent", "Range", "Selection", "DOMParser", "HTMLInputElement",
]) if ((win as any)[k] !== undefined) g[k] = (win as any)[k];
g.getComputedStyle = win.getComputedStyle.bind(win);
g.ResizeObserver = (win as any).ResizeObserver;
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;

const DARK_QUERY = "(prefers-color-scheme: dark)";
let systemDark = false;
const mqListeners = new Set<(e: { type: string; matches: boolean }) => void>();
(win as any).matchMedia = g.matchMedia = (query: string) => ({
  media: query,
  get matches() { return query === DARK_QUERY ? systemDark : false; },
  addEventListener: (_: string, cb: any) => { if (query === DARK_QUERY) mqListeners.add(cb); },
  removeEventListener: (_: string, cb: any) => { if (query === DARK_QUERY) mqListeners.delete(cb); },
});
const setSystemDark = async (v: boolean) => {
  systemDark = v;
  await act(async () => { [...mqListeners].forEach((cb) => cb({ type: "change", matches: v })); });
};

// antd's rc-motion/rc-select schedule updates this harness doesn't control.
const origErr = console.error;
console.error = (...a: unknown[]) => {
  const m = String(a[0] ?? "");
  if (m.includes("not wrapped in act") || m.includes("findDOMNode")) return;
  origErr(...a);
};

let failures = 0;
const expect = (cond: unknown, msg: string) => {
  console.log(`${cond ? "✔" : "✗"} ${msg}`);
  if (!cond) failures += 1;
};
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (cond: () => boolean, label: string, timeout = 8000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for: ${label}`);
    await act(async () => { await settle(20); });
  }
};

// react-dom feature-detects the `input` event ONCE, at import time. Imported
// statically (hoisted above the happy-dom setup) it saw no `document`,
// permanently chose its legacy fallback, and simulated typing silently did
// nothing — for every input, even a stock antd Select. Load it after.
const { createRoot } = await import("react-dom/client");
const { RichTextViewer } = await import("../src/components/RichTextViewer/RichTextViewer");
const { createCodeBlockNodeRenderers } = await import("../src/nodes/CodeBlock/viewer/CodeBlockView");
const { CodeBlockHeader } = await import("../src/nodes/CodeBlock/shared/CodeBlockHeader");
const { CODE_LANGUAGES } = await import("../src/nodes/CodeBlock/languages");

const $ = (sel: string, root: ParentNode = win.document.body as any): any => root.querySelector(sel);
const $$ = (sel: string, root: ParentNode = win.document.body as any): any[] => [...root.querySelectorAll(sel)];
const click = async (el: any) => { await act(async () => { el.dispatchEvent(new (win as any).MouseEvent("click", { bubbles: true })); }); await settle(); };
const mouseDown = async (el: any) => { await act(async () => { el.dispatchEvent(new (win as any).MouseEvent("mousedown", { bubbles: true })); }); await settle(); };
const typeInto = async (input: any, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor((win as any).HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new (win as any).Event("input", { bubbles: true }));
  });
  await settle();
};
/** Opens an antd Select (by its aria-label) and returns it. */
const openSelect = async (root: ParentNode, label: string) => {
  const input = $(`input[aria-label="${label}"]`, root);
  const select = input.closest(".ant-select");
  await mouseDown($(".ant-select-selector", select) ?? select);
  return select;
};
const visibleOptions = () => $$(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option");
const optionByText = (text: string) => visibleOptions().find((o) => o.textContent?.trim() === text);
const selectedText = (select: any) =>
  ($(".ant-select-selection-item", select) ?? $(".ant-select-content", select))?.textContent?.trim();

const mount = async (el: React.ReactElement): Promise<{ root: Root; box: any }> => {
  const box = win.document.createElement("div");
  win.document.body.appendChild(box as any);
  const root = createRoot(box as any);
  await act(async () => { root.render(el); });
  await settle();
  return { root, box };
};

// ================================================================ Viewer
console.log("\n--- Viewer code block ---");
const JSX_CODE = [
  "import { Crepe } from '@milkdown/crepe'",
  "// We have some themes for you to choose",
  "",
  "const crepe = new Crepe({",
  "  root: '#app',",
  "  defaultValue: '# Hello, Milkdown!',",
  "})",
  "",
  "crepe.create().then(() => {",
  "  console.log('Milkdown is ready!')",
  "})",
].join("\n");
const codeDoc = (language: string, text: string) => ({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "before" }] },
    { type: "codeBlock", attrs: { language }, content: text ? [{ type: "text", text }] : undefined },
  ],
});
const viewer = (language: string, text: string) =>
  React.createElement(RichTextViewer, { value: codeDoc(language, text), nodeRenderers: createCodeBlockNodeRenderers() });

{
  const { box, root } = await mount(viewer("jsx", JSX_CODE));
  const frame = $(".rte-codeblock", box);
  expect(!!frame, "Viewer renders the code block frame (not the plain default <pre>)");
  expect(frame.classList.contains("rte-codeblock--light"), "default theme 'system' resolves to light when the OS is light");
  expect($(".rte-codeblock__lang", box)?.textContent === "JSX", `header shows the language as a label ("JSX"), got ${JSON.stringify($(".rte-codeblock__lang", box)?.textContent)}`);
  expect(!$('input[aria-label="Code language"]', box), "Viewer has no language Select (a reader can't change document data)");
  expect(!!$('input[aria-label="Code theme"]', box), "Viewer has the theme Select");
  expect(selectedText($(".ant-select", box)) === "System", `theme Select defaults to "System", got ${JSON.stringify(selectedText($(".ant-select", box)))}`);
  expect($(".rte-codeblock__copy", box)?.textContent?.trim() === "Copy", "Copy button is present");

  const lineText = () => $$(".rte-code-line", box).map((l) => l.textContent).join("\n");
  expect(lineText() === JSX_CODE, "static lines reproduce the code exactly (incl. blank lines and indentation)");
  expect($$(".rte-code-line", box).length === JSX_CODE.split("\n").length, `one .rte-code-line per source line (${$$(".rte-code-line", box).length}) — drives the CSS line numbers`);
  await waitFor(() => !!$(".tok-keyword", box), "syntax highlighting to load");
  expect(!!$(".tok-keyword", box) && !!$(".tok-string", box) && !!$(".tok-comment", box), "after the lazy parser loads, keywords/strings/comments get tok-* classes");
  expect(lineText() === JSX_CODE, "…and highlighting doesn't change the text");
  expect(!$(".cm-editor", box) && !$(".cm-content", box), "no CodeMirror EditorView exists in the Viewer (spec 24.2)");
  expect(!$("script, textarea", box), "(sanity) no stray editing elements");

  // system theme follows the OS live
  await setSystemDark(true);
  expect(frame.classList.contains("rte-codeblock--dark") && !frame.classList.contains("rte-codeblock--light"), "'system': OS goes dark -> block goes dark, live");
  await setSystemDark(false);
  expect(frame.classList.contains("rte-codeblock--light"), "…and back to light");

  // theme Select, through the real dropdown
  await openSelect(box, "Code theme");
  expect(["System", "Light", "Dark"].every((t) => optionByText(t)), "theme dropdown offers exactly System / Light / Dark");
  expect(visibleOptions().length === 3, `…and nothing else (${visibleOptions().length} options)`);
  await click(optionByText("Dark"));
  expect(frame.classList.contains("rte-codeblock--dark"), "choosing Dark in the Select switches the block to dark");
  expect(selectedText($(".ant-select", box)) === "Dark", "…and the Select shows Dark");
  await setSystemDark(false);
  expect(frame.classList.contains("rte-codeblock--dark"), "explicit Dark ignores the OS preference");

  // copy
  const written: string[] = [];
  Object.defineProperty(win.navigator, "clipboard", { value: { writeText: async (t: string) => { written.push(t); } }, configurable: true });
  await click($(".rte-codeblock__copy", box));
  expect(written.length === 1 && written[0] === JSX_CODE, "Copy writes exactly the code text (no line numbers, no markup) to the clipboard");
  expect($(".rte-codeblock__copy", box).textContent.includes("Copied"), "…and the button confirms with 'Copied'");
  await act(async () => { await settle(1700); });
  expect($(".rte-codeblock__copy", box).textContent.trim() === "Copy", "…then reverts to 'Copy'");

  // clipboard unavailable -> legacy path; both failing -> honest message
  Object.defineProperty(win.navigator, "clipboard", { value: undefined, configurable: true });
  let legacyCopied = "";
  (win.document as any).execCommand = (cmd: string) => { legacyCopied = ($("textarea") as any)?.value ?? ""; return cmd === "copy"; };
  await click($(".rte-codeblock__copy", box));
  expect(legacyCopied === JSX_CODE, "without the Clipboard API (plain http), falls back to execCommand with the same text");
expect(!$("textarea"), "…and cleans up its temporary textarea");
  (win.document as any).execCommand = () => false;
  await act(async () => { await settle(1700); });
  await click($(".rte-codeblock__copy", box));
  expect($(".rte-codeblock__copy", box).textContent.includes("Copy failed"), "when copying really fails, it says so instead of claiming success");

  await act(async () => { root.unmount(); });
  expect(mqListeners.size === 0, "unmounting leaves no OS-theme listener behind");
}

// plain / unknown languages
{
  const { box, root } = await mount(viewer("plaintext", "a\n\nb"));
  expect($(".rte-codeblock__lang", box)?.textContent === "Plain text", "plaintext shows the label 'Plain text'");
  expect($$(".rte-code-line", box).length === 3 && !$(".tok-keyword", box), "plain text: 3 lines (blank line kept), no highlighting");
  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(viewer("klingon", "qapla'"));
  await act(async () => { await settle(200); });
  expect($(".rte-codeblock__lang", box)?.textContent === "klingon", "an unknown language is shown as itself, not hidden");
  expect($$(".rte-code-line", box)[0]?.textContent === "qapla'", "…and its code still renders, unhighlighted");
  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(viewer("py", "def f(): pass"));
  await waitFor(() => !!$(".tok-keyword", box), "alias 'py' to highlight");
  expect($(".rte-codeblock__lang", box)?.textContent === "Python", "alias 'py' is labelled 'Python' and highlighted");
  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(viewer("javascript", ""));
  expect($$(".rte-code-line", box).length === 1 && $(".rte-code-line", box).textContent === "", "an empty block renders one empty line");
  await act(async () => { root.unmount(); });
}

// =============================================================== Header
console.log("\n--- Header: language Select (Editor mode) ---");
{
  const calls: string[] = [];
  const themes: string[] = [];
  const props = (over: any = {}) => ({
    language: "javascript", theme: "system" as const, getCode: () => "code",
    onThemeChange: (t: string) => themes.push(t), onLanguageChange: (id: string) => calls.push(id), ...over,
  });
  const { box, root } = await mount(React.createElement(CodeBlockHeader, props() as any));

  const langSelect = $('input[aria-label="Code language"]', box).closest(".ant-select");
  expect(selectedText(langSelect) === "JavaScript", `language Select shows the stored language's label (got ${JSON.stringify(selectedText(langSelect))})`);
  expect(!!$(".rte-codeblock__select--theme", box), "theme Select sits beside it");

  await openSelect(box, "Code language");
  expect(visibleOptions().length > 5, "the dropdown lists languages");
  expect(
    visibleOptions().length < CODE_LANGUAGES.length,
    `the dropdown virtualizes its options (${visibleOptions().length} of ${CODE_LANGUAGES.length} in the DOM)`,
  );
  const first = visibleOptions()[0];
  expect(first.textContent.trim() === "Plain text", `the first option is "Plain text" (default), got ${JSON.stringify(first?.textContent)}`);

  const input = $('input[aria-label="Code language"]', box);
  await typeInto(input, "pyth");
  expect(!!optionByText("Python") && !optionByText("JavaScript"), "typing filters the list by name ('pyth' -> Python)");
  await click(optionByText("Python"));
  expect(calls.length === 1 && calls[0] === "python", `choosing Python calls onLanguageChange("python") (got ${JSON.stringify(calls)})`);

  await openSelect(box, "Code language");
  await typeInto($('input[aria-label="Code language"]', box), "csharp");
  expect(!!optionByText("C#"), "searching an ALIAS ('csharp') finds C#");
  await typeInto($('input[aria-label="Code language"]', box), "zzzz-nothing");
  expect(visibleOptions().length === 0, "a search with no match shows nothing");

  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(React.createElement(CodeBlockHeader, { language: "js", theme: "dark", getCode: () => "", onThemeChange: () => {}, onLanguageChange: () => {} } as any));
  expect(selectedText($('input[aria-label="Code language"]', box).closest(".ant-select")) === "JavaScript", "a stored alias ('js') is displayed as its real name");
  expect(selectedText($('input[aria-label="Code theme"]', box).closest(".ant-select")) === "Dark", "theme Select reflects the given theme");
  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(React.createElement(CodeBlockHeader, { language: "klingon", theme: "system", getCode: () => "", onThemeChange: () => {}, onLanguageChange: () => {} } as any));
  expect(selectedText($('input[aria-label="Code language"]', box).closest(".ant-select")) === "klingon", "an unknown stored language still shows in the Select instead of a blank");
  await act(async () => { root.unmount(); });
}
{
  const { box, root } = await mount(React.createElement(CodeBlockHeader, { language: "python", theme: "system", editable: false, getCode: () => "", onThemeChange: () => {}, onLanguageChange: () => {} } as any));
  expect($('input[aria-label="Code language"]', box).closest(".ant-select").classList.contains("ant-select-disabled"), "a locked (readOnly) editor disables the language Select");
  expect(!$(".rte-codeblock__select--theme.ant-select-disabled", box), "…but the theme (a runtime view preference) stays usable");
  await act(async () => { root.unmount(); });
}
expect(CODE_LANGUAGES.length === 144, `the Select's source list has all 143 CodeMirror languages + Plain text (${CODE_LANGUAGES.length})`);

console.log(failures ? `\n✗ ${failures} assertion(s) failed` : "\n✔ CodeBlock Viewer + header UI behave correctly");
process.exit(failures ? 1 : 0);
