import { EditorContent } from "@tiptap/react";
import { useRichTextEditor } from "./Context";

export interface ContentProps {
  className?: string;
}

/**
 * Renders the actual editable surface. This is the one library-provided
 * layout primitive besides the controls themselves (spec section 10):
 * everything else (where Content sits relative to controls, wrappers,
 * borders, toolbars) is left to the consumer.
 */
export const Content = ({ className }: ContentProps) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <EditorContent
      editor={editor}
      className={["rte-content", className].filter(Boolean).join(" ")}
    />
  );
};
