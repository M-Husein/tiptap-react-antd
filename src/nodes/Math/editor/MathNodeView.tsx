import { useEffect, useRef } from "react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import "mathlive"; // side effect: registers the <math-field> custom element
import type { MathfieldElement } from "mathlive";

/**
 * Editor-only NodeView. Unlike Image/Embed's NodeViews (which show a
 * static presentation plus a popover trigger for editing), this mounts a
 * live MathLive `<math-field>` directly and permanently — MathLive's own
 * widget already looks like clean typeset math until focused and becomes
 * an editing surface on click, the same way a well-designed `<input>`
 * does, so there's no separate "display vs. edit" state to manage here.
 * (This is also why there's no `shared/MathView.tsx` reuse in the Editor
 * the way Image/Embed share their presentation component — `MathView`'s
 * `convertLatexToMarkup` is a *static* renderer; the Viewer uses it
 * precisely because it must not load this interactive widget at all,
 * spec section 8.)
 *
 * `<math-field>` is created imperatively (not written as JSX) because
 * its value is a JS property, not an HTML attribute, and because
 * mounting/tearing it down needs explicit lifecycle control — React has
 * no built-in way to bind a property (as opposed to an attribute) on a
 * custom element declaratively.
 */
export const MathNodeView = ({ node, updateAttributes, editor }: ReactNodeViewProps) => {
  const display = node.type.name === "math";
  const latex = String(node.attrs.latex ?? "");

  const containerRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);

  // Mount once; torn down on unmount. Not re-created on every latex
  // change (that would reset cursor position mid-edit) — latex sync from
  // outside happens in the separate effect below instead.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const field = document.createElement("math-field") as MathfieldElement;
    field.value = latex;
    field.defaultMode = display ? "math" : "inline-math";
    field.smartMode = true;

    const onInput = () => {
      const next = field.value;
      if (next !== node.attrs.latex) updateAttributes({ latex: next });
    };
    field.addEventListener("input", onInput);
    container.appendChild(field);
    fieldRef.current = field;

    return () => {
      field.removeEventListener("input", onInput);
      field.remove();
      fieldRef.current = null;
    };
    // Intentionally mount-once: see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the live field in sync with external attribute changes (undo/
  // redo, programmatic updateMath() calls) without clobbering in-progress
  // typing — only push `.value` when it actually differs from what the
  // field already shows.
  useEffect(() => {
    const field = fieldRef.current;
    if (field && field.value !== latex) field.value = latex;
  }, [latex]);

  useEffect(() => {
    const field = fieldRef.current;
    if (field) field.readOnly = !editor.isEditable;
  }, [editor.isEditable]);

  return (
    <NodeViewWrapper
      as={display ? "div" : "span"}
      className={display ? "rte-math" : "rte-math-inline"}
    >
      {/* contentEditable={false}: tells ProseMirror this subtree manages
       * its own focus/cursor — without it, ProseMirror and the math-field
       * both try to own typing/selection inside here and fight. */}
      <span ref={containerRef} contentEditable={false} />
    </NodeViewWrapper>
  );
};
