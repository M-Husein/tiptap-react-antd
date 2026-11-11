import { useMemo } from "react";
import type { AnyExtension } from "@tiptap/core";
import { createCoreExtensions } from "../../editor/extensions/core";
import { mergeExtensions } from "../../editor/extensions/merge";
import { parseContent } from "../../editor/content/parse";
import type { ContentFormat } from "../../editor/types";
import {
  defaultNodeRenderers,
  mergeNodeRenderers,
  renderChildren,
  type NodeRenderer,
} from "../../viewer/renderer/nodes";
import {
  defaultMarkRenderers,
  mergeMarkRenderers,
  type MarkRenderer,
} from "../../viewer/renderer/marks";

export interface RichTextViewerProps {
  value?: unknown;
  format?: ContentFormat;
  /** Additional/overriding node renderers, e.g. from Phase 5+ node packages. */
  nodeRenderers?: Record<string, NodeRenderer>;
  /** Additional/overriding mark renderers. */
  markRenderers?: Record<string, MarkRenderer>;
  /**
   * Extensions used only to *parse* html/markdown input into the canonical
   * JSON shape (via a headless schema, spec section 8/38) — this does NOT
   * create an editor, an EditorView, or any NodeViews.
   */
  extensions?: AnyExtension[];
  className?: string;
}

/**
 * RichTextViewer is a first-class renderer (spec section 8) — NOT
 * `<RichTextEditor readOnly />`. It never constructs a Tiptap Editor, a
 * ProseMirror EditorView, or editing NodeViews; it walks the canonical
 * JSON document and renders plain React elements, sharing the same
 * presentation registry (viewer/renderer) that Editor NodeViews are meant
 * to reuse for visual parity (spec 8.1/32).
 */
export const RichTextViewer = ({
  value,
  format = "json",
  nodeRenderers,
  markRenderers,
  extensions: extraExtensions,
  className,
}: RichTextViewerProps) => {
  const extensions = useMemo(
    () => mergeExtensions(createCoreExtensions(), extraExtensions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extraExtensions],
  );

  const doc = useMemo(
    () => parseContent(value, format, extensions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, format],
  );

  const ctx = useMemo(
    () => ({
      nodeRegistry: nodeRenderers
        ? mergeNodeRenderers(nodeRenderers)
        : defaultNodeRenderers,
      markRegistry: markRenderers
        ? mergeMarkRenderers(markRenderers)
        : defaultMarkRenderers,
    }),
    [nodeRenderers, markRenderers],
  );

  return (
    <div className={["rte-viewer", "rte-content", className].filter(Boolean).join(" ")}>
      {renderChildren(doc.content, ctx)}
    </div>
  );
};
