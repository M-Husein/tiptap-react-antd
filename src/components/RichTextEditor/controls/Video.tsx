import { forwardRef, useState } from "react";
import { Button, Popover, Input, Space, type ButtonProps } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface VideoProps extends Omit<ButtonProps, "onClick"> {}

/** Editor control (Phase 6) — inserts a self-hosted video from a direct file URL. */
export const Video = forwardRef<HTMLButtonElement, VideoProps>((props, ref) => {
  const editor = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");

  if (!editor) return null;

  const apply = () => {
    if (src) editor.chain().focus().setVideo({ src }).run();
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
            placeholder="https://example.com/video.mp4"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onPressEnter={apply}
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={apply}>
            Insert
          </Button>
        </Space.Compact>
      }
    >
      <Button ref={ref} icon={<VideoCameraOutlined />} {...props} />
    </Popover>
  );
});

Video.displayName = "Video";
