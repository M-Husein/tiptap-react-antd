import { forwardRef, useState } from "react";
import { Button, Popover, Input, Space, type ButtonProps } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface ImageProps extends Omit<ButtonProps, "onClick"> {}

/**
 * Editor control (Phase 5) — inserts a block image from a URL.
 * Requires createImageEditorExtensions() (or createImageExtensions() for
 * read/parse only) to be included in the editor's extensions.
 *
 * This does not implement upload/crop/rotate (spec 19.1) — wire your own
 * upload flow and pass the resulting URL in here, or call
 * `editor.commands.setImage({ src })` directly from your own UI.
 */
export const Image = forwardRef<HTMLButtonElement, ImageProps>((props, ref) => {
  const editor = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");

  if (!editor) return null;

  const apply = () => {
    if (src) {
      editor.chain().focus().setImage({ src }).run();
    }
    setOpen(false);
    setSrc("");
  };

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={
        <Space.Compact>
          <Input
            placeholder="https://example.com/image.png"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onPressEnter={apply}
            style={{ width: 240 }}
          />
          <Button type="primary" onClick={apply}>
            Insert
          </Button>
        </Space.Compact>
      }
    >
      <Button ref={ref} icon={<PictureOutlined />} {...props} />
    </Popover>
  );
});

Image.displayName = "Image";
