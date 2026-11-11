import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useEditor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import { createCoreExtensions } from "../../editor/extensions/core";
import { mergeExtensions } from "../../editor/extensions/merge";
import { createTaskItemForEditor } from "../../editor/extensions/task-item";
import { parseContent } from "../../editor/content/parse";
import { serializeContent } from "../../editor/content/serialize";
import type { ControlledContentProps } from "../../editor/types";
import { RichTextEditorContext } from "./Context";

export interface RichTextEditorProps extends ControlledContentProps {
  /** Temporary lock — does NOT replace RichTextViewer (spec 8.4). */
  readOnly?: boolean;
  /** Placeholder shown when the document is empty. */
  placeholder?: string;
  /**
   * Extension point for Phase 4+ features (tables, text-style, image,
   * media, math, diagrams, advanced content). Additive to the Phase 1
   * core set — this file does not need to change as those land.
   */
  extensions?: AnyExtension[];
  className?: string;
  children?: ReactNode;
}

export const RichTextEditor = ({
  value,
  format = "json",
  onChange,
  readOnly = false,
  placeholder,
  extensions: extraExtensions,
  className,
  children,
}: RichTextEditorProps) => {
  const extensions = useMemo(
    () =>
      // mergeExtensions lets a consumer extension replace a same-named core
      // one in place (e.g. the CodeMirror-backed `codeBlock`), instead of
      // registering a duplicate name.
      mergeExtensions(
        createCoreExtensions({
          placeholder,
          // Swaps in the antd-Checkbox NodeView for checklists — always on,
          // not opt-in, since a styled checklist is baseline behavior the
          // same way Bold/Italic are. RichTextViewer uses the plain
          // schema-only TaskItem from createCoreExtensions()'s own default.
          taskItem: createTaskItemForEditor(),
        }),
        extraExtensions,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeholder, extraExtensions],
  );

  // Tracks the last value *we* emitted via onChange so the controlled-value
  // sync effect below doesn't feed it straight back into setContent and
  // clobber the user's cursor position.
  const lastEmitted = useRef<unknown>(undefined);

  const editor = useEditor({
    extensions,
    editable: !readOnly,
    content: parseContent(value, format, extensions),
    onUpdate: ({ editor: e }) => {
      const next = serializeContent(e.getJSON(), format, extensions);
      lastEmitted.current = next;
      onChange?.(next);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === undefined) return;
    if (value === lastEmitted.current) return; // our own echo, skip
    const isSame =
      typeof value === "string" &&
      typeof lastEmitted.current === "string" &&
      value === lastEmitted.current;
    if (isSame) return;
    const doc = parseContent(value, format, extensions);
    editor.commands.setContent(doc, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value, format]);

  return (
    <RichTextEditorContext.Provider value={{ editor }}>
      <div className={["rte-editor", className].filter(Boolean).join(" ")}>
        {children}
      </div>
    </RichTextEditorContext.Provider>
  );
};
