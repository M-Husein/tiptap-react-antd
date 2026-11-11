import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

export const serializeAudio = (node: JSONContent): MarkdownRepresentation => {
  const { src, title } = node.attrs ?? {};
  const attrs = [`src="${src ?? ""}"`, title ? `title="${title}"` : "", "controls"]
    .filter(Boolean)
    .join(" ");
  return { type: "html", value: `<audio ${attrs}></audio>` };
};
