/**
 * Editor-only Math extensions. Split from ../extension.ts (mirroring
 * nodes/Image/editor/extensions.ts and nodes/Embed/editor/extensions.ts)
 * so that RichTextViewer — which only needs the schema for parsing —
 * never pulls in @tiptap/react's NodeView runtime or MathLive's
 * interactive `<math-field>` custom element (spec section 33: keep the
 * Viewer bundle lightweight; the Viewer only ever needs the DOM-free
 * `mathlive/ssr` static renderer, via shared/MathView.tsx).
 */

import { ReactNodeViewRenderer } from "@tiptap/react";
import { Math, MathInline } from "../extension";
import { MathNodeView } from "./MathNodeView";

export const createMathEditorExtensions = () => [
  Math.extend({
    addNodeView() {
      return ReactNodeViewRenderer(MathNodeView);
    },
  }),
  MathInline.extend({
    addNodeView() {
      return ReactNodeViewRenderer(MathNodeView);
    },
  }),
];
