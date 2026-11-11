import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { CheckSquareOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface ChecklistProps extends Omit<ButtonProps, "onClick"> {}

/**
 * Editor control — toggles a checklist (task list) on the current block.
 * Items render as Ant Design Checkboxes in both Editor and Viewer (see
 * nodeviews/TaskItemNodeView.tsx and viewer/renderer/nodes.tsx).
 */
export const Checklist = forwardRef<HTMLButtonElement, ChecklistProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      type={editor.isActive("taskList") ? "primary" : "default"}
      icon={<CheckSquareOutlined />}
      onClick={() => editor.chain().focus().toggleTaskList().run()}
      {...props}
    />
  );
});

Checklist.displayName = "Checklist";
