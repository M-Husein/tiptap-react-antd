import { useState } from "react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Space, Button, Input, InputNumber, Popover } from "antd";
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from "@ant-design/icons";
import { ImageFigure } from "../shared/ImageFigure";
import type { ImageAlign, ImageDisplayMode } from "../types";

/**
 * Editor-only NodeView (spec 8.2): adds selection styling and a small
 * inline settings popover (align/float/caption/alt/width). Renders the
 * exact same <ImageFigure> the Viewer uses for the actual image, so
 * visual parity holds outside of this editing chrome (spec 8.1).
 *
 * Deliberately out of scope here (spec 19.1): the pre-upload editor
 * (crop/rotate/flip/source resize) and the upload pipeline itself — those
 * are application-specific and belong in the consuming app, which should
 * call `editor.commands.setImage({ src })` once it has an uploaded URL.
 */
export const ImageNodeView = ({ node, updateAttributes, selected }: ReactNodeViewProps) => {
  const { src, alt, title, caption, displayMode, align, width, height } = node.attrs;
  const [open, setOpen] = useState(false);

  const overlay = selected ? (
    <div
      style={{
        position: "absolute",
        top: 4,
        right: 4,
        background: "rgba(255,255,255,0.9)",
        borderRadius: 6,
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }}
    >
      <Popover
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        content={
          <Space orientation="vertical" style={{ width: 260 }}>
            <Space.Compact>
              <Button
                type={align === "left" ? "primary" : "default"}
                icon={<AlignLeftOutlined />}
                onClick={() => updateAttributes({ align: "left" as ImageAlign })}
              />
              <Button
                type={(align ?? "center") === "center" ? "primary" : "default"}
                icon={<AlignCenterOutlined />}
                onClick={() => updateAttributes({ align: "center" as ImageAlign })}
              />
              <Button
                type={align === "right" ? "primary" : "default"}
                icon={<AlignRightOutlined />}
                onClick={() => updateAttributes({ align: "right" as ImageAlign })}
              />
            </Space.Compact>
            <Space.Compact>
              {(["block", "float-left", "float-right"] as ImageDisplayMode[]).map((mode) => (
                <Button
                  key={mode}
                  type={(displayMode ?? "block") === mode ? "primary" : "default"}
                  onClick={() => updateAttributes({ displayMode: mode })}
                >
                  {mode}
                </Button>
              ))}
            </Space.Compact>
            <Input
              placeholder="Alt text"
              value={alt ?? ""}
              onChange={(e) => updateAttributes({ alt: e.target.value })}
            />
            <Input
              placeholder="Caption"
              value={caption ?? ""}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
            />
            <InputNumber
              placeholder="Width (px)"
              style={{ width: "100%" }}
              value={width ?? undefined}
              onChange={(v) => updateAttributes({ width: v })}
            />
          </Space>
        }
      >
        <Button size="small">Edit image</Button>
      </Popover>
    </div>
  ) : null;

  return (
    <NodeViewWrapper as="span" className={selected ? "rte-image-selected" : undefined}>
      <ImageFigure
        src={src}
        alt={alt}
        title={title}
        caption={caption}
        displayMode={displayMode}
        align={align}
        width={width}
        height={height}
        editorOverlay={overlay}
      />
    </NodeViewWrapper>
  );
};
