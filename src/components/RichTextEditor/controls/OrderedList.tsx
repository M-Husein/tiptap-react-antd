import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { OrderedListOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface OrderedListProps extends Omit<ButtonProps, "onClick"> {}

export const OrderedList = forwardRef<HTMLButtonElement, OrderedListProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      type={editor.isActive("orderedList") ? "primary" : "default"}
      icon={<OrderedListOutlined />}
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      {...props}
    />
  );
});

OrderedList.displayName = "OrderedList";
