import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

/** No native/custom markdown for video — always HTML fallback (spec 5.3). */
export const serializeVideo = (node: JSONContent): MarkdownRepresentation => {
  const { src, poster, width, height } = node.attrs ?? {};
  const attrs = [
    `src="${src ?? ""}"`,
    poster ? `poster="${poster}"` : "",
    width ? `width="${width}"` : "",
    height ? `height="${height}"` : "",
    "controls",
  ]
    .filter(Boolean)
    .join(" ");
  return { type: "html", value: `<video ${attrs}></video>` };
};
