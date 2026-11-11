import { ImageFigure, ImageInlineSpan } from "../shared/ImageFigure";
import type { NodeRenderer } from "../../../viewer/renderer/nodes";

/**
 * Shared presentation (spec 8.1/32) — RichTextViewer never constructs a
 * NodeView, so this is a plain function returning the same <ImageFigure>
 * the editor's NodeView renders, just without any editorOverlay.
 */
export const imageNodeRenderers: Record<string, NodeRenderer> = {
  image: (node, key) => (
    <ImageFigure
      key={key}
      src={String(node.attrs?.src ?? "")}
      alt={node.attrs?.alt}
      title={node.attrs?.title}
      caption={node.attrs?.caption}
      displayMode={node.attrs?.displayMode}
      align={node.attrs?.align}
      width={node.attrs?.width}
      height={node.attrs?.height}
    />
  ),
  imageInline: (node, key) => (
    <ImageInlineSpan
      key={key}
      src={String(node.attrs?.src ?? "")}
      alt={node.attrs?.alt}
      width={node.attrs?.width}
      verticalAlign={node.attrs?.verticalAlign}
    />
  ),
};
