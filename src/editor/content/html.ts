/**
 * HTML representation of the canonical Tiptap JSON document.
 *
 * Uses @tiptap/html so conversion does not require a live editor instance —
 * this is what lets RichTextViewer avoid initializing ProseMirror at all
 * (spec section 8) while still being able to accept `format="html"`.
 */

import { generateHTML, generateJSON } from "@tiptap/html";
import type { AnyExtension, JSONContent } from "@tiptap/core";

export const jsonToHtml = (
  doc: JSONContent,
  extensions: AnyExtension[],
): string => generateHTML(doc, extensions);

export const htmlToJson = (
  html: string,
  extensions: AnyExtension[],
): JSONContent => generateJSON(html, extensions);
