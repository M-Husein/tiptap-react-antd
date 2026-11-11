import { forwardRef, useState } from "react";
import { Button, Popover, Input, Select, Space, type ButtonProps } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";
import type { EmbedProvider } from "../../../nodes/Embed/security";

export interface EmbedProps extends Omit<ButtonProps, "onClick"> {
  /** Providers offered in the dropdown. Default: youtube, vimeo, custom. */
  providers?: EmbedProvider[];
}

/**
 * Editor control (Phase 6) — inserts a semantic Embed node (YouTube,
 * Vimeo, or a "custom" provider your app has allowlisted via
 * `createEmbedExtensions({ allowedCustomOrigins: [...] })`).
 *
 * The URL is validated at render time (src/nodes/Embed/security.ts), not
 * here — an invalid/disallowed URL still inserts the node but it renders
 * as a blocked placeholder instead of a live iframe.
 */
export const Embed = forwardRef<HTMLButtonElement, EmbedProps>(
  ({ providers = ["youtube", "vimeo", "custom"], ...props }, ref) => {
    const editor = useRichTextEditor();
    const [open, setOpen] = useState(false);
    const [src, setSrc] = useState("");
    const [provider, setProvider] = useState<EmbedProvider>(providers[0]);

    if (!editor) return null;

    const apply = () => {
      if (src) editor.chain().focus().setEmbed({ src, provider }).run();
      setOpen(false);
      setSrc("");
    };

    return (
      <Popover
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        content={
          <Space orientation="vertical">
            <Select
              value={provider}
              onChange={setProvider}
              style={{ width: 160 }}
              options={providers.map((p) => ({ value: p, label: p }))}
            />
            <Space.Compact>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                onPressEnter={apply}
                style={{ width: 260 }}
              />
              <Button type="primary" onClick={apply}>
                Insert
              </Button>
            </Space.Compact>
          </Space>
        }
      >
        <Button ref={ref} icon={<GlobalOutlined />} {...props} />
      </Popover>
    );
  },
);

Embed.displayName = "Embed";
