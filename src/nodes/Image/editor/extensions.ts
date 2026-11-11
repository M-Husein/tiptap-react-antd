/**
 * Editor-only image extensions. Split from ../extension.ts so that
 * RichTextViewer (or anything only parsing html/markdown into JSON) can
 * use the plain schema without pulling in @tiptap/react's NodeView runtime
 * or the Ant Design editing controls (spec section 33 — keep the Viewer
 * bundle lightweight).
 */

import { ReactNodeViewRenderer } from "@tiptap/react";
import { Image, ImageInline } from "../extension";
import { ImageNodeView } from "./ImageNodeView";

export const createImageEditorExtensions = () => [
  Image.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ImageNodeView);
    },
  }),
  ImageInline,
];
