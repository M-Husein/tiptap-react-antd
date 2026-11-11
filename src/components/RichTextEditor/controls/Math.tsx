import { forwardRef, useEffect, useRef, useState } from "react";
import { Button, Modal, Segmented, type ButtonProps } from "antd";
import { FunctionOutlined } from "@ant-design/icons";
import "mathlive";
import type { MathfieldElement } from "mathlive";
import { useRichTextEditor } from "../Context";

export interface MathProps extends Omit<ButtonProps, "onClick"> {}

/**
 * Editor control — opens a modal with a live MathLive `<math-field>` for
 * composing a new expression, inserted as either inline or block/display
 * math. Editing an *existing* math node happens in place (click directly
 * into it — see nodes/Math/editor/MathNodeView.tsx), not through this
 * control; this one is for insertion only.
 *
 * Exported as `Math` here (matching how Image.tsx/Table.tsx/Embed.tsx
 * name their own control files) — the alias to `MathControl` that avoids
 * colliding with the global `Math` object happens at the editor-entry.ts
 * export boundary, same as `Image as ImageControl` etc.
 */
export const Math = forwardRef<HTMLButtonElement, MathProps>((props, ref) => {
  const editor = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"inline" | "block">("inline");
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    if (!open || !containerEl) return;
    const field = document.createElement("math-field") as MathfieldElement;
    field.value = "";
    field.defaultMode = mode === "block" ? "math" : "inline-math";
    containerEl.appendChild(field);
    fieldRef.current = field;
    // Focusing immediately on mount is the expected UX for a "compose and
    // insert" modal — the user opened it specifically to start typing math.
    field.focus();

    return () => {
      field.remove();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, containerEl]);

  useEffect(() => {
    if (fieldRef.current) fieldRef.current.defaultMode = mode === "block" ? "math" : "inline-math";
  }, [mode]);

  if (!editor) return null;

  const apply = () => {
    const latex = fieldRef.current?.value ?? "";
    if (latex) {
      if (mode === "block") {
        editor.chain().focus().setMath({ latex }).run();
      } else {
        editor.chain().focus().setMathInline({ latex }).run();
      }
    }
    setOpen(false);
  };

  return (
    <>
      <Button ref={ref} icon={<FunctionOutlined />} onClick={() => setOpen(true)} {...props} />
      <Modal title="Insert math" open={open} onCancel={() => setOpen(false)} onOk={apply}>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "inline" | "block")}
          options={[
            { label: "Inline", value: "inline" },
            { label: "Block", value: "block" },
          ]}
          style={{ marginBottom: 12 }}
        />
        <div
          ref={setContainerEl}
          style={{ border: "1px solid #d9d9d9", borderRadius: 6, padding: 8, minHeight: 48 }}
        />
      </Modal>
    </>
  );
});

Math.displayName = "Math";
