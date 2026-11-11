/**
 * Markdown representation of the canonical Tiptap JSON document.
 *
 * Strategy (spec section 5): per semantic unit, prefer Native Markdown;
 * if that would lose information, fall back to Custom Markdown; if that is
 * still insufficient, fall back to raw HTML. We never globally flatten the
 * whole document to HTML just because one advanced feature exists
 * (RULE 8/9/10).
 *
 * Link is a special case of this: it's a MARK that can wrap either text
 * or an Image, and the Link spec requires the whole Link+content unit to
 * be decided jointly — an image that itself needs HTML fallback (e.g. it
 * has a `width`) means the *entire* `<a><img></a>` is emitted as HTML,
 * not just the `<img>` (see link-markdown.ts / nodes/Image/markdown.ts's
 * describeImageForMarkdown, which this file composes together).
 *
 * Parsing markdown -> JSON is implemented as markdown -> HTML -> JSON,
 * using the same extension schema as the rest of the library, so any raw
 * HTML fallback embedded in the markdown round-trips correctly.
 */

import MarkdownIt from "markdown-it";
import type { AnyExtension, JSONContent } from "@tiptap/core";
import { htmlToJson } from "./html";
import type { MarkdownRepresentation } from "../types";
import { serializeTable } from "./table-markdown";
import { describeLinkForMarkdown, type LinkAttrs } from "./link-markdown";
import {
  serializeImage,
  serializeImageInline,
  describeImageForMarkdown,
} from "../../nodes/Image/markdown";
import { serializeVideo } from "../../nodes/Video/markdown";
import { serializeAudio } from "../../nodes/Audio/markdown";
import { serializeEmbed } from "../../nodes/Embed/markdown";
import { serializeMath, serializeMathInline } from "../../nodes/Math/markdown";
import { serializeCodeBlock } from "../../nodes/CodeBlock/markdown";
import { mathMarkdownItPlugin } from "./markdown-it-math";

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
md.use(mathMarkdownItPlugin);

// markdown-it renders a fenced block's content with a trailing "\n" on
// every block (`<code>…\n</code>`), because in Markdown each content line
// ends in a newline. Left alone, that newline becomes part of the node's
// text — so every Markdown round trip would grow the code by one blank
// line. Strip exactly the one it added (a block that genuinely ends in a
// newline keeps that one: the serializer writes it as a blank line before
// the closing fence).
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = token.info.trim().split(/\s+/)[0] ?? "";
  const code = md.utils.escapeHtml(token.content.replace(/\n$/, ""));
  const cls = lang ? ` class="language-${md.utils.escapeHtml(lang)}"` : "";
  return `<pre><code${cls}>${code}</code></pre>\n`;
};

// ---------------------------------------------------------------------------
// JSON -> Markdown
// ---------------------------------------------------------------------------

const escapeText = (text: string): string =>
  text.replace(/([\\`*_{}[\]()#+.!-])/g, "\\$1");

interface MarkAttrs {
  [key: string]: unknown;
}

/** Every mark except "link", which is handled separately (see below) since
 * it needs to see the *node* it's wrapping (text vs image), not just the
 * already-stringified inner text. */
const wrapMark = (
  type: string,
  attrs: MarkAttrs | undefined,
  inner: string,
): MarkdownRepresentation => {
  switch (type) {
    case "bold":
      return { type: "native", value: `**${inner}**` };
    case "italic":
      return { type: "native", value: `_${inner}_` };
    case "strike":
      return { type: "native", value: `~~${inner}~~` };
    case "code":
      return { type: "native", value: `\`${inner}\`` };
    case "underline":
      // No native/custom markdown for underline -> HTML fallback (RULE 9/10).
      return { type: "html", value: `<u>${inner}</u>` };
    default:
      return { type: "html", value: inner };
  }
};

/** Link wrapping plain text (Link spec Rule 1 / Rule 3). */
const wrapTextLink = (text: string, attrs: LinkAttrs): string => {
  const link = describeLinkForMarkdown(attrs);
  return link.isSimple ? `[${text}](${link.hrefPart})` : `${link.htmlOpenTag}${text}</a>`;
};

/** Link wrapping an Image (Link spec "Image Inside Link" / Rule 2 / Rule 4).
 * Decided jointly: BOTH the image and the link must be native-compatible
 * for the native `[![alt](src)](href)` form, otherwise the complete
 * structure is HTML — never just the image half. */
const wrapImageLink = (imageNode: JSONContent, linkAttrs: LinkAttrs): string => {
  const image = describeImageForMarkdown(imageNode.attrs);
  const link = describeLinkForMarkdown(linkAttrs);
  if (image.isSimple && link.isSimple) {
    return `[${image.nativeSyntax}](${link.hrefPart})`;
  }
  return `${link.htmlOpenTag}${image.htmlImgTag}</a>`;
};

const findLinkMark = (node: JSONContent) => node.marks?.find((m) => m.type === "link");

const serializeInline = (nodes: JSONContent[] = []): string =>
  nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";

      if (node.type === "imageInline") {
        const linkMark = findLinkMark(node);
        return linkMark
          ? wrapImageLink(node, linkMark.attrs as LinkAttrs)
          : serializeImageInline(node).value;
      }

      if (node.type === "mathInline") return serializeMathInline(node).value;

      if (node.type === "text") {
        const hasMarks = Boolean(node.marks && node.marks.length);
        let text = hasMarks ? node.text ?? "" : escapeText(node.text ?? "");
        // Apply every non-link mark first (innermost), link last
        // (outermost) — e.g. **bold** wrapped by a link becomes
        // [**bold**](href), matching how the marks are usually authored.
        for (const mark of node.marks ?? []) {
          if (mark.type === "link") continue;
          text = wrapMark(mark.type, mark.attrs, text).value;
        }
        const linkMark = findLinkMark(node);
        if (linkMark) text = wrapTextLink(text, linkMark.attrs as LinkAttrs);
        return text;
      }

      return "";
    })
    .join("");

const indentLines = (text: string, prefix: string): string =>
  text
    .split("\n")
    .map((line) => (line.length ? prefix + line : line))
    .join("\n");

const serializeListItems = (
  items: JSONContent[] = [],
  ordered: boolean,
): string =>
  items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-";
      const body = (item.content ?? [])
        .map((child) => serializeNode(child))
        .join("\n")
        .trim();
      return `${marker} ${body}`;
    })
    .join("\n");

const serializeNode = (node: JSONContent): string => {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content) || "";
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `${"#".repeat(level)} ${serializeInline(node.content)}`;
    }
    case "bulletList":
      return serializeListItems(node.content, false);
    case "orderedList":
      return serializeListItems(node.content, true);
    case "taskList":
      return (node.content ?? [])
        .map((item) => {
          const checked = Boolean(item.attrs?.checked);
          const body = (item.content ?? [])
            .map((child) => serializeNode(child))
            .join("\n")
            .trim();
          return `- [${checked ? "x" : " "}] ${body}`;
        })
        .join("\n");
    case "blockquote":
      return indentLines(
        (node.content ?? []).map((child) => serializeNode(child)).join("\n\n"),
        "> ",
      );
    case "codeBlock":
      return serializeCodeBlock(node).value;
    case "horizontalRule":
      return "---";
    case "hardBreak":
      return "  \n";
    case "table":
      return serializeTable(node).value;
    case "image": {
      const linkMark = findLinkMark(node);
      return linkMark
        ? wrapImageLink(node, linkMark.attrs as LinkAttrs)
        : serializeImage(node).value;
    }
    case "math":
      return serializeMath(node).value;
    case "video":
      return serializeVideo(node).value;
    case "audio":
      return serializeAudio(node).value;
    case "embed":
      return serializeEmbed(node).value;
    default:
      return "";
  }
};

export const jsonToMarkdown = (doc: JSONContent): string =>
  (doc.content ?? [])
    .map((node) => serializeNode(node))
    .filter((s) => s.length > 0)
    .join("\n\n")
    .trim() + "\n";

// ---------------------------------------------------------------------------
// Markdown -> JSON  (markdown -> HTML -> JSON, so raw HTML fallback and
// custom markdown extensions can both be layered on top of `md` later)
// ---------------------------------------------------------------------------

export const markdownToJson = (
  markdown: string,
  extensions: AnyExtension[],
): JSONContent => {
  const html = md.render(markdown);
  return htmlToJson(html, extensions);
};
