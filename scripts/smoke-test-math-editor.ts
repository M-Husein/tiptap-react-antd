/**
 * Exercises the two live-MathLive code paths against the REAL widget:
 * nodes/Math/editor/MathNodeView.tsx (edit in place) and
 * components/RichTextEditor/controls/Math.tsx (the insert modal). The Editor itself can't be mounted under happy-dom (ProseMirror
 * needs real Selection/Range APIs — see README), so this renders the
 * NodeView component directly with fake NodeView props instead. That's the
 * only way anything in CI touches the live `<math-field>` code path.
 *
 * Two harness details worth knowing, both learned the hard way:
 *  1. Under Node, `import "mathlive"` resolves (via the package's "node"
 *     export condition) to `mathlive-ssr.min.mjs` — a DOM-free stub that
 *     registers NO custom element. A test that merely imports "mathlive"
 *     would be silently testing a plain HTMLElement and "passing". So the
 *     real browser build is loaded by file path and asserted to have
 *     registered before anything else runs.
 *  2. happy-dom lacks the Font Loading API (document.fonts / FontFace)
 *     MathLive's constructor touches, so minimal stubs are installed. In a
 *     real app `mathlive/static.css` sets --ML__static-fonts and MathLive
 *     skips font loading entirely; the stubs just stand in for that.
 */
import { createRoot } from "react-dom/client";
import * as React from "react";
import { act } from "react";
import { Window } from "happy-dom";

const win = new Window();
const g: any = global;
g.window = win;
g.document = win.document;
Object.defineProperty(global, "navigator", { value: win.navigator, configurable: true });
for (const k of [
  "HTMLElement", "SVGElement", "Element", "ShadowRoot", "Node", "customElements",
  "CustomEvent", "Event", "InputEvent", "MutationObserver", "DocumentFragment",
  "CSSStyleSheet", "HTMLTemplateElement", "KeyboardEvent", "MouseEvent",
  "UIEvent", "FocusEvent", "PointerEvent", "WheelEvent", "ClipboardEvent", "DragEvent", "CompositionEvent",
]) g[k] = (win as any)[k];
g.getComputedStyle = win.getComputedStyle.bind(win);
g.ResizeObserver = (win as any).ResizeObserver;
g.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} };
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id: any) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;
(win.document as any).fonts = {
  ready: Promise.resolve(), load: async () => [], check: () => true, add: () => {}, forEach: () => {},
};
g.FontFace ??= class { constructor(public family: string) {} load() { return Promise.resolve(this); } };

let failures = 0;
const expect = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✔" : "✗"} ${msg}`);
  if (!cond) failures += 1;
};

// MathLive logs a non-fatal "Invalid URL ./fonts/" when it can't resolve its
// font directory outside a bundler; keep test output readable.
const origErr = console.error;
console.error = (...a: unknown[]) => {
  const m = String(a[0] ?? "");
  // "Invalid URL ./fonts/": see above. "not wrapped in act": antd's modal
  // animation (rc-motion) schedules its own async state updates which this
  // harness doesn't control; they don't affect any assertion here.
  if (m.includes("Invalid URL") || m.includes("not wrapped in act")) return;
  origErr(...a);
};

// @ts-expect-error - importing browser build directly by relative path
await import("../node_modules/mathlive/mathlive.mjs");
const MathfieldCtor = win.customElements.get("math-field");
expect(!!MathfieldCtor, "real MathLive browser build registered <math-field> (not the SSR stub)");
if (!MathfieldCtor) process.exit(1);

const { MathNodeView } = await import("../src/nodes/Math/editor/MathNodeView");

const updates: Array<{ latex: string }> = [];
const makeProps = (latex: string, name = "mathInline", isEditable = true): any => ({
  node: { type: { name }, attrs: { latex } },
  updateAttributes: (a: { latex: string }) => updates.push(a),
  editor: { isEditable },
});

const container = win.document.createElement("div");
win.document.body.appendChild(container as any);
const root = createRoot(container as any);
const render = async (props: any) => {
  await act(async () => { root.render(React.createElement(MathNodeView, props)); });
  await new Promise((r) => setTimeout(r, 50));
};

// --- mount -----------------------------------------------------------------
await render(makeProps("x^2"));
const field: any = container.querySelector("math-field");
expect(!!field, "NodeView mounts a <math-field>");
expect(field instanceof (MathfieldCtor as any), "…which is a real MathfieldElement instance, not a plain HTMLElement");
expect(field.value === "x^2", `initial value comes from node attrs (got ${JSON.stringify(field?.value)})`);
expect(field.defaultMode === "inline-math", `inline node uses defaultMode "inline-math" (got ${field?.defaultMode})`);
expect((container.firstElementChild as any)?.tagName === "SPAN", "inline node wraps in a <span>");

// --- user typing -> attrs --------------------------------------------------
field.value = "y^3";
field.dispatchEvent(new (win as any).InputEvent("input", { bubbles: true }));
expect(updates.length === 1 && updates[0].latex === "y^3", `input event -> updateAttributes({latex:"y^3"}) (got ${JSON.stringify(updates)})`);

// --- external change (undo/redo) syncs in WITHOUT a feedback loop ----------
updates.length = 0;
await render(makeProps("a+b"));
expect(field.value === "a+b", `external attr change is pushed into the live field (got ${JSON.stringify(field.value)})`);
expect(updates.length === 0, "…and does NOT echo back through updateAttributes (no feedback loop)");

// --- read-only follows editor.isEditable -----------------------------------
expect(field.readOnly === false, "editable editor -> field not read-only");
await render(makeProps("a+b", "mathInline", false));
expect(field.readOnly === true, "locked editor (readOnly prop) -> field read-only");

// --- still the SAME element across re-renders (not re-created) -------------
expect(container.querySelector("math-field") === field, "field element is reused across re-renders (cursor isn't reset mid-edit)");

// --- block node variant ----------------------------------------------------
await act(async () => { root.unmount(); });
expect(container.querySelector("math-field") === null, "unmount removes the <math-field> (no leak)");
const root2 = createRoot(container as any);
await act(async () => { root2.render(React.createElement(MathNodeView, makeProps("\\frac{a}{b}", "math"))); });
await new Promise((r) => setTimeout(r, 50));
const blockField: any = container.querySelector("math-field");
expect((container.firstElementChild as any)?.tagName === "DIV", "block node wraps in a <div>");
expect(blockField?.defaultMode === "math", `block node uses defaultMode "math" (got ${blockField?.defaultMode})`);

// ===========================================================================
// Insert control (components/RichTextEditor/controls/Math.tsx)
// ===========================================================================
await act(async () => { root2.unmount(); });

const { Math: MathControl } = await import("../src/components/RichTextEditor/controls/Math");
const { RichTextEditorContext } = await import("../src/components/RichTextEditor/Context");

const calls: Array<{ cmd: string; attrs: { latex: string } }> = [];
const fakeEditor: any = {
  chain: () => ({
    focus: () => ({
      setMath: (attrs: any) => ({ run: () => calls.push({ cmd: "setMath", attrs }) }),
      setMathInline: (attrs: any) => ({ run: () => calls.push({ cmd: "setMathInline", attrs }) }),
    }),
  }),
};

const host = win.document.createElement("div");
win.document.body.appendChild(host as any);
const root3 = createRoot(host as any);
const settle = () => new Promise((r) => setTimeout(r, 80));
const mountControl = async () => {
  await act(async () => {
    root3.render(
      React.createElement(RichTextEditorContext.Provider, { value: { editor: fakeEditor } },
        React.createElement(MathControl)),
    );
  });
  await settle();
};
const click = async (el: any) => {
  await act(async () => { el.dispatchEvent(new (win as any).MouseEvent("click", { bubbles: true })); });
  await settle();
};
const modalField = (): any => win.document.body.querySelector(".ant-modal math-field");
const okButton = (): any => [...win.document.body.querySelectorAll(".ant-modal-footer button")].find((b: any) => b.classList.contains("ant-btn-primary"));
const segment = (label: string): any => [...win.document.body.querySelectorAll(".ant-segmented-item")].find((e: any) => e.textContent?.trim() === label);

await mountControl();
expect(!!host.querySelector("button"), "Math control renders a toolbar button");
expect(modalField() === null, "no <math-field> exists until the modal opens");

// Inline (default mode)
await click(host.querySelector("button"));
let f = modalField();
expect(!!f && f instanceof (MathfieldCtor as any), "opening the modal mounts a real <math-field>");
expect(f?.defaultMode === "inline-math", `modal starts in Inline mode (defaultMode ${f?.defaultMode})`);
f.value = "x^2+1";
await click(okButton());
expect(calls.length === 1 && calls[0].cmd === "setMathInline" && calls[0].attrs.latex === "x^2+1",
  `Inline + OK -> setMathInline({latex:"x^2+1"}) (got ${JSON.stringify(calls)})`);

// Block
calls.length = 0;
await click(host.querySelector("button"));
await click(segment("Block"));
f = modalField();
expect(f?.defaultMode === "math", `switching to Block updates the live field's defaultMode (got ${f?.defaultMode})`);
f.value = "\\int_0^1 x\\,dx";
await click(okButton());
expect(calls.length === 1 && calls[0].cmd === "setMath" && calls[0].attrs.latex === "\\int_0^1 x\\,dx",
  `Block + OK -> setMath with latex intact (got ${JSON.stringify(calls)})`);

// Empty input must not insert an empty equation
calls.length = 0;
await click(host.querySelector("button"));
await click(okButton());
expect(calls.length === 0, "OK with an empty field inserts nothing");

console.log(failures ? `\n✗ ${failures} assertion(s) failed` : "\n✔ Math NodeView + insert control behave correctly against the real MathLive widget");
process.exit(failures ? 1 : 0);
