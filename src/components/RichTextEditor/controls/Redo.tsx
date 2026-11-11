import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface RedoProps extends Omit<ButtonProps, "onClick"> {}

export const Redo = forwardRef<HTMLButtonElement, RedoProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      icon={<RedoOutlined />}
      disabled={!editor.can().redo()}
      onClick={() => editor.chain().focus().redo().run()}
      {...props}
    />
  );
});

Redo.displayName = "Redo";
