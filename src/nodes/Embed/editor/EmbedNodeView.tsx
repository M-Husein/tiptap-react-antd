import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { EmbedFrame } from "../shared/EmbedFrame";
import type { EmbedValidationOptions } from "../security";

/**
 * Editor-only NodeView. Renders the exact same <EmbedFrame> component the
 * Viewer uses (spec 8.1: Editor and Viewer must render content visually
 * the same) — without this, the editor falls back to the node's own
 * renderHTML producing a bare, fixed-size iframe with none of
 * EmbedFrame's responsive aspect-ratio box, which is what caused the
 * Editor/Viewer mismatch this NodeView exists to fix.
 */
export const EmbedNodeView = ({ node, selected, extension }: ReactNodeViewProps) => {
  const { src, provider, width, height, title } = node.attrs;
  const validation = extension.options as EmbedValidationOptions;

  return (
    <NodeViewWrapper className={selected ? "rte-embed-selected" : undefined}>
      <EmbedFrame
        src={src}
        provider={provider}
        width={width}
        height={height}
        title={title}
        validation={validation}
      />
    </NodeViewWrapper>
  );
};
