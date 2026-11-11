/**
 * Canonical document model + public content-format types.
 *
 * IMPORTANT (per spec):
 * - Tiptap JSON is the canonical internal representation (RULE 1).
 * - HTML and Markdown are *representations* of that canonical document.
 * - This file must not depend on Ant Design, Tailwind, CodeMirror, or any
 *   runtime-only editor preference.
 */

import type { JSONContent } from "@tiptap/core";

/** Public content formats the library accepts/emits. */
export type ContentFormat = "json" | "html" | "markdown";

/** A content value tagged with the format it's encoded in. */
export type ContentValue =
  | { format: "json"; value: JSONContent }
  | { format: "html"; value: string }
  | { format: "markdown"; value: string };

/** Re-exported for convenience so consumers don't need a direct @tiptap/core dep. */
export type { JSONContent };

/**
 * Conceptual serializer representation (spec 5.6).
 * Used internally by capability-aware markdown serialization to decide,
 * per semantic unit, whether native markdown, custom markdown, or a raw
 * HTML fallback is required to preserve information (RULE 8/9/10).
 */
export interface MarkdownRepresentation {
  type: "native" | "custom" | "html";
  value: string;
}

/**
 * Shared props between RichTextEditor and (conceptually) how content flows
 * into RichTextViewer. Kept here because it is architecture, not UI.
 */
export interface ControlledContentProps {
  /** Controlled value. Shape depends on `format`. */
  value?: ContentValue["value"];
  /** Which of the three public formats `value`/`onChange` use. Defaults to "json". */
  format?: ContentFormat;
  /** Called with a value in the same `format` whenever the document changes. */
  onChange?: (value: ContentValue["value"]) => void;
}
