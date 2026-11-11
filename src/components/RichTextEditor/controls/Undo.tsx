import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface UndoProps extends Omit<ButtonProps, "onClick"> {}

export const Undo = forwardRef<HTMLButtonElement, UndoProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      icon={<UndoOutlined />}
      disabled={!editor.can().undo()}
      onClick={() => editor.chain().focus().undo().run()}
      {...props}
    />
  );
});

Undo.displayName = "Undo";
