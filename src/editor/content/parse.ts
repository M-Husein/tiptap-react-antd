import type { AnyExtension, JSONContent } from "@tiptap/core";
import type { ContentFormat } from "../types";
import { assertDocShape, emptyDoc } from "./json";
import { htmlToJson } from "./html";
import { markdownToJson } from "./markdown";

/**
 * Converts a value in any public ContentFormat into the canonical Tiptap
 * JSON document. This is the single entry point RichTextEditor/Viewer use
 * so "JSON is canonical" (RULE 1) is enforced in exactly one place.
 */
export const parseContent = (
  value: unknown,
  format: ContentFormat,
  extensions: AnyExtension[],
): JSONContent => {
  if (value == null) return emptyDoc();

  switch (format) {
    case "json":
      return assertDocShape(value);
    case "html":
      return htmlToJson(String(value), extensions);
    case "markdown":
      return markdownToJson(String(value), extensions);
    default: {
      const _exhaustive: never = format;
      throw new Error(`[rte] Unknown content format: ${String(_exhaustive)}`);
    }
  }
};
