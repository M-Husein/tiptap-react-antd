/**
 * Editor-only Embed extension. Split from ../extension.ts (mirroring
 * nodes/Image/editor/extensions.ts) so that RichTextViewer — which only
 * needs the schema for parsing — never pulls in @tiptap/react's NodeView
 * runtime (spec section 33: keep the Viewer bundle lightweight).
 */

import { ReactNodeViewRenderer } from "@tiptap/react";
import { Embed, type EmbedExtensionOptions } from "../extension";
import { EmbedNodeView } from "./EmbedNodeView";

export const createEmbedEditorExtensions = (options?: EmbedExtensionOptions) => [
  Embed.extend({
    addNodeView() {
      return ReactNodeViewRenderer(EmbedNodeView);
    },
  }).configure(options ?? {}),
];
