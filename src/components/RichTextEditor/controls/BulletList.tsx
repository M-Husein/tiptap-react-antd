import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface BulletListProps extends Omit<ButtonProps, "onClick"> {}

export const BulletList = forwardRef<HTMLButtonElement, BulletListProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      type={editor.isActive("bulletList") ? "primary" : "default"}
      icon={<UnorderedListOutlined />}
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      {...props}
    />
  );
});

BulletList.displayName = "BulletList";
