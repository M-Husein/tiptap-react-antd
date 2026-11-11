/**
 * Pure JSON -> Markdown/HTML serialization for `image`/`imageInline`
 * nodes (spec 19.12/19.13), plus a reusable `describeImageForMarkdown`
 * that the Link serializer (src/editor/content/link-markdown.ts) composes
 * with to implement "Image Inside Link" (see markdown_link_spec) —
 * the Link+Image combination must be decided jointly, not by serializing
 * each independently and gluing the strings together.
 */

import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

export interface ImageMarkdownInfo {
  /** True if every attribute present can be represented in native Markdown. */
  isSimple: boolean;
  /** `![alt](src)` or `![alt](src "title")` — only meaningful when isSimple. */
  nativeSyntax: string;
  /** A standalone `<img ...>` tag carrying every attribute, for HTML fallback. */
  htmlImgTag: string;
}

const escapeAlt = (s: string) => s.replace(/[[\]]/g, "\\$&");

/**
 * Shared capability check for both the `image` (block/float) and
 * `imageInline` node shapes. `src`/`alt`/`title` are native-Markdown
 * compatible (CommonMark's `![alt](src "title")` syntax); anything else
 * present (width/height/caption/align/displayMode !== defaults/
 * verticalAlign !== baseline) forces HTML (RULE 9/10).
 */
export const describeImageForMarkdown = (attrs: JSONContent["attrs"]): ImageMarkdownInfo => {
  const {
    src,
    alt,
    title,
    caption,
    align,
    displayMode,
    width,
    height,
    verticalAlign,
  } = attrs ?? {};

  const isSimple =
    !caption &&
    !width &&
    !height &&
    (!displayMode || displayMode === "block") &&
    (!align || align === "center") &&
    (!verticalAlign || verticalAlign === "baseline");

  const nativeSyntax = title
    ? `![${escapeAlt(alt ?? "")}](${src ?? ""} "${title}")`
    : `![${escapeAlt(alt ?? "")}](${src ?? ""})`;

  const imgAttrPairs = [
    `src="${src ?? ""}"`,
    `alt="${alt ?? ""}"`,
    title ? `title="${title}"` : "",
    width ? `width="${width}"` : "",
    height ? `height="${height}"` : "",
    verticalAlign && verticalAlign !== "baseline"
      ? `style="vertical-align:${verticalAlign}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { isSimple, nativeSyntax, htmlImgTag: `<img ${imgAttrPairs} />` };
};

export const serializeImage = (node: JSONContent): MarkdownRepresentation => {
  const { caption, align, displayMode } = node.attrs ?? {};
  const info = describeImageForMarkdown(node.attrs);

  if (info.isSimple) {
    return { type: "native", value: info.nativeSyntax };
  }

  const figure = caption
    ? `<figure data-rte-image data-align="${align ?? "center"}" data-display-mode="${displayMode ?? "block"}">${info.htmlImgTag}<figcaption>${caption}</figcaption></figure>`
    : info.htmlImgTag.replace(
        " />",
        ` data-align="${align ?? "center"}" data-display-mode="${displayMode ?? "block"}" />`,
      );

  return { type: "html", value: figure };
};

export const serializeImageInline = (node: JSONContent): MarkdownRepresentation => {
  const info = describeImageForMarkdown(node.attrs);
  return info.isSimple
    ? { type: "native", value: info.nativeSyntax }
    : { type: "html", value: info.htmlImgTag };
};
