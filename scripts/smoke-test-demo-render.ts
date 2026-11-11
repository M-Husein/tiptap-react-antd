/**
 * Headless render check for src/App.tsx — catches runtime errors
 * (hook misuse, undefined component, missing extension, etc.) that a
 * type check or a production bundle build can't, since JSX in this
 * component only actually *executes* once rendered.
 */
import { Window } from "happy-dom";

// Intercepted so this script actually fails (not just prints) if a
// findDOMNode-in-StrictMode warning reappears — e.g. a future control
// added to the toolbar without React.forwardRef, then wrapped in
// <Tooltip>, would silently reintroduce the exact bug this guards.
const capturedWarnings: string[] = [];
// Tiptap logs this via console.warn when two extensions share a name — what
// would happen if the CodeMirror codeBlock were appended next to the core
// one instead of replacing it (see mergeExtensions).
const duplicateExtensionWarnings: string[] = [];
const origConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("Duplicate extension names")) duplicateExtensionWarnings.push(msg);
  origConsoleWarn(...args);
};
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("findDOMNode")) capturedWarnings.push(msg);
  origConsoleError(...args);
};


/**
 * Polls until `cond()` holds instead of sleeping a fixed time and hoping
 * React has flushed by then. Fixed sleeps are a classic source of flaky
 * "empty output" failures under CPU contention — and they fail with no
 * explanation. This fails loudly with *what* it was waiting for.
 */
const waitFor = async (cond: () => boolean, label: string, timeoutMs = 10_000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out after ${timeoutMs}ms waiting for: ${label}`);
    }
    await new Promise((r) => setTimeout(r, 20));
  }
};

const win = new Window();
// @ts-expect-error - assigning happy-dom globals for a Node test env
global.window = win;
// @ts-expect-error
global.document = win.document;
Object.defineProperty(global, "navigator", { value: win.navigator, configurable: true });
// @ts-expect-error
global.HTMLElement = win.HTMLElement;
// @ts-expect-error
global.SVGElement = win.SVGElement;
// @ts-expect-error
global.Element = win.Element;
// @ts-expect-error
global.ShadowRoot = win.ShadowRoot;
// CodeMirror (the demo's code blocks) needs these too; ProseMirror alone didn't.
for (const k of ["MutationObserver", "Range", "Selection", "DocumentFragment", "KeyboardEvent", "MouseEvent", "UIEvent", "FocusEvent", "InputEvent", "CustomEvent", "Event", "DOMParser", "CSSStyleSheet"]) {
  if ((win as any)[k] !== undefined) (global as any)[k] = (win as any)[k];
}
// @ts-expect-error
global.Node = win.Node;
// @ts-expect-error
global.customElements = win.customElements;
// @ts-expect-error
global.getComputedStyle = win.getComputedStyle.bind(win);
// @ts-expect-error
global.ResizeObserver = win.ResizeObserver;
// @ts-expect-error
global.matchMedia = win.matchMedia?.bind(win);
// @ts-expect-error
global.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
// @ts-expect-error
global.cancelAnimationFrame = (id: number) => clearTimeout(id);

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { default: App } = await import("../src/App");

const container = win.document.createElement("div");
win.document.body.appendChild(container as any);

const root = createRoot(container as any);
root.render(React.createElement(React.StrictMode, null, React.createElement(App)));

// Let effects (useEditor async init, etc.) flush.
await waitFor(() => container.innerHTML.length > 100, "demo App to render into its container");
// Effects (useEditor init, antd's own mount effects) settle a tick after the
// first paint of markup; one short grace period beyond "something rendered"
// keeps the later checks from racing them.
await new Promise((r) => setTimeout(r, 100));

const html = container.innerHTML;
if (!html || html.length < 100) {
  throw new Error("App rendered empty/near-empty output — something failed silently.");
}

console.log("Rendered OK. Output length:", html.length);
console.log("Contains toolbar button (Bold)?", html.includes("BoldOutlined") || html.includes("svg"));
console.log("Contains table?", html.includes("<table"));
console.log("Contains image figure?", html.includes("<figure") || html.includes("rte-image"));

// The demo defines 3 code blocks and opts into createCodeBlockEditorExtensions().
// A real Tiptap editor DOES mount NodeViews under happy-dom (it's the React
// ones that need EditorContent), so this checks the actual demo wiring.
const editorFailures: string[] = [];
const expectEditor = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✔" : "✗"} ${msg}`);
  if (!cond) editorFailures.push(msg);
};
await waitFor(() => container.querySelectorAll(".rte-codeblock").length >= 3, "the demo's 3 CodeMirror code blocks to mount");
expectEditor(container.querySelectorAll(".rte-codeblock").length === 3, "demo editor mounts all 3 code blocks as CodeMirror NodeViews");
expectEditor(container.querySelectorAll(".cm-editor").length === 3, "…each hosting a real CodeMirror editor");
// Scoped to the editor: the demo App also shows the document JSON in its own <pre>.
const editorRoot = container.querySelector(".rte-editor");
expectEditor(!!editorRoot && editorRoot.querySelectorAll("pre").length === 0, "…and none of the plain core <pre> blocks is left over inside the editor (replaced by name, not duplicated)");
expectEditor(container.querySelectorAll(".cm-lineNumbers").length === 3, "…each with a line-number gutter");
expectEditor(duplicateExtensionWarnings.length === 0, `no "Duplicate extension names" warning from Tiptap (${duplicateExtensionWarnings.length})`);

// The editor mounts a real ProseMirror EditorView, which does a lot of
// direct Selection/Range/DOM-measurement work that happy-dom doesn't
// fully implement — so also verify Image/Embed/Table data renders via
// the Viewer path (plain React, no ProseMirror) to isolate whether a
// gap above is a library bug or a headless-DOM testing limitation.
const { RichTextViewer } = await import("../src/viewer-entry");
const { createTableExtensions } = await import("../src/editor/extensions/table");
const { createImageExtensions } = await import("../src/nodes/Image/extension");
const { createEmbedExtensions } = await import("../src/nodes/Embed/extension");
const { tableNodeRenderers } = await import("../src/editor/extensions/table");
const { imageNodeRenderers } = await import("../src/nodes/Image/viewer/ImageView");
const { createEmbedNodeRenderers } = await import("../src/nodes/Embed/viewer/EmbedView");
const { createMathExtensions } = await import("../src/nodes/Math/extension");
const { mathNodeRenderers } = await import("../src/nodes/Math/viewer/MathView");
const { createCodeBlockNodeRenderers } = await import("../src/nodes/CodeBlock/viewer/CodeBlockView");
const { default: App2 } = await import("../src/App");

const viewerContainer = win.document.createElement("div");
win.document.body.appendChild(viewerContainer as any);
const viewerRoot = createRoot(viewerContainer as any);

// Pull the same sample doc used by the demo by re-requiring it isn't
// exported, so just inline an equivalent minimal doc here instead.
const sampleDoc = {
  type: "doc",
  content: [
    { type: "image", attrs: { src: "https://picsum.photos/id/1015/640/360", alt: "x", caption: "cap", align: "center", displayMode: "block" } },
    { type: "embed", attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", provider: "youtube", width: 480, height: 270 } },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "inline " },
        { type: "mathInline", attrs: { latex: "x^2" } },
        { type: "text", text: " here" },
      ],
    },
    { type: "math", attrs: { latex: "\\frac{a}{b}", display: true } },
    { type: "codeBlock", attrs: { language: "python" }, content: [{ type: "text", text: "def f():\n    return 1" }] },
  ],
};

viewerRoot.render(
  React.createElement(RichTextViewer, {
    value: sampleDoc,
    extensions: [...createTableExtensions(), ...createImageExtensions(), ...createEmbedExtensions(), ...createMathExtensions()],
    nodeRenderers: { ...tableNodeRenderers, ...imageNodeRenderers, ...createEmbedNodeRenderers(), ...mathNodeRenderers, ...createCodeBlockNodeRenderers() },
  }),
);

await waitFor(() => viewerContainer.innerHTML.length > 0, "RichTextViewer to render into its container");
const viewerHtml = viewerContainer.innerHTML;
console.log("\n--- Viewer-only render (no ProseMirror) ---");
console.log("Viewer output length:", viewerHtml.length);

// Real assertions (not just printed booleans) — a printed `false` is easy
// to miss, and has been misread before when output got truncated.
const viewerFailures: string[] = [];
const expectViewer = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✔" : "✗"} ${msg}`);
  if (!cond) viewerFailures.push(msg);
};
expectViewer(viewerHtml.includes("picsum"), "Viewer renders image src");
expectViewer(viewerHtml.includes("youtube-nocookie"), "Viewer renders resolved youtube-nocookie iframe");
// MathLive's static markup always wraps output in an `ML__latex` span.
expectViewer((viewerHtml.match(/ML__latex/g) ?? []).length === 2, "Viewer typesets both math nodes via MathLive (2 x ML__latex)");
expectViewer(/class="rte-math-inline"/.test(viewerHtml), "Viewer renders inline math in a .rte-math-inline span");
expectViewer(/<div class="rte-math"/.test(viewerHtml), "Viewer renders block math in a .rte-math div");
expectViewer(!viewerHtml.includes("<math-field"), "Viewer never instantiates the interactive <math-field>");
expectViewer(/class="rte-codeblock rte-codeblock--(light|dark)"/.test(viewerHtml), "Viewer renders the CodeBlock frame (not the plain default <pre>)");
expectViewer(/rte-codeblock__lang">Python</.test(viewerHtml), "Viewer's code block header labels the language ('Python')");
expectViewer((viewerHtml.match(/rte-code-line/g) ?? []).length === 2, "Viewer renders one .rte-code-line per source line (2)");
expectViewer(!viewerHtml.includes("cm-editor") && !viewerHtml.includes("cm-content"), "Viewer's code block contains no CodeMirror editor");
if (editorFailures.length > 0) {
  console.error(`\n✗ ${editorFailures.length} editor assertion(s) failed`);
  process.exit(1);
}
if (viewerFailures.length > 0) {
  console.error(`\n✗ ${viewerFailures.length} viewer assertion(s) failed`);
  console.error(`  viewer HTML length: ${viewerHtml.length}`);
  console.error(`  viewer HTML (first 600 chars): ${viewerHtml.slice(0, 600)}`);
  process.exit(1);
}

if (capturedWarnings.length > 0) {
  console.error(`\n✗ ${capturedWarnings.length} findDOMNode warning(s) during render:`);
  for (const w of capturedWarnings) console.error("  -", w.split("\n")[0]);
  process.exit(1);
}
console.log("\n✔ no findDOMNode warnings (every toolbar control forwards its ref correctly)");

process.exit(0);
