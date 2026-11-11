import type { AnyExtension, JSONContent } from "@tiptap/core";
import type { ContentFormat, ContentValue } from "../types";
import { jsonToHtml } from "./html";
import { jsonToMarkdown } from "./markdown";

/**
 * Converts the canonical Tiptap JSON document into any public
 * ContentFormat. Used by onChange to hand the consumer back data in
 * whatever `format` they configured (RULE 1: JSON stays canonical
 * internally regardless of what the public API emits).
 */
export const serializeContent = (
  doc: JSONContent,
  format: ContentFormat,
  extensions: AnyExtension[],
): ContentValue["value"] => {
  switch (format) {
    case "json":
      return doc;
    case "html":
      return jsonToHtml(doc, extensions);
    case "markdown":
      return jsonToMarkdown(doc);
    default: {
      const _exhaustive: never = format;
      throw new Error(`[rte] Unknown content format: ${String(_exhaustive)}`);
    }
  }
};
