import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

/**
 * Embed always serializes as the same marker-carrying, responsive
 * `<div class="rte-embed"><iframe data-rte-embed>...` shape the
 * extension's own renderHTML produces (spec 8.1: Editor/Viewer parity —
 * see extension.ts and shared/EmbedFrame.tsx) — never the *resolved*
 * provider URL; the original `src`/`provider` are what round-trips,
 * re-validation/resolution happens again on the way back in
 * (extension.ts parseHTML -> resolveEmbed), same as the live editor path.
 *
 * `data-src` (not a real `src`) carries the original URL so that a
 * generic markdown/HTML renderer outside this library — one that doesn't
 * know to re-run resolveEmbed — can't accidentally turn this into a live,
 * unsandboxed iframe; only this library's own parser reads `data-src`.
 */
export const serializeEmbed = (node: JSONContent): MarkdownRepresentation => {
  const { src, provider, width, height, title } = node.attrs ?? {};
  const w = width ?? 560;
  const h = height ?? 315;
  const attrs = [
    `data-rte-embed`,
    `data-src="${src ?? ""}"`,
    `data-provider="${provider ?? "custom"}"`,
    `width="${w}"`,
    `height="${h}"`,
    title ? `title="${title}"` : "",
    `style="width:100%;height:100%;border:0"`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    type: "html",
    value: `<div class="rte-embed" style="aspect-ratio:${w}/${h}"><iframe ${attrs}></iframe></div>`,
  };
};
