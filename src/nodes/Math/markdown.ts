/**
 * Math markdown serialization (spec section 5.2: Custom Markdown — the
 * same tier the spec names Mermaid's fenced syntax as an example of).
 * There's no *native* CommonMark representation for LaTeX, so this skips
 * straight to the custom tier: `$latex$` for inline, `$$latex$$` on its
 * own line for block/display — the de facto convention most markdown
 * tooling with any math support already uses (Jupyter, Obsidian, GitHub).
 *
 * If the latex itself contains a literal `$`, the custom syntax becomes
 * ambiguous (where does the math end?), so that one semantic unit falls
 * back to the same `data-rte-math(-inline)` HTML marker
 * extension.ts's own parseHTML already recognizes (RULE 8/9: capability
 * decided per unit, never losing information for prettier markdown).
 */

import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

export const serializeMath = (node: JSONContent): MarkdownRepresentation => {
  const latex = String(node.attrs?.latex ?? "");
  if (latex.includes("$")) {
    return {
      type: "html",
      value: `<div class="rte-math" data-rte-math data-display="true" data-latex="${escapeAttr(latex)}"></div>`,
    };
  }
  // markdown-it-math.ts's block rule only recognizes multi-line content
  // when the opening/closing `$$` each sit alone on their own line — the
  // single-line `$$latex$$` form can't contain a real newline and still
  // parse back correctly (the rule reads only the first source line when
  // deciding whether the block is "single-line", so embedded `\n`s would
  // silently fall through to plain paragraph text on re-parse otherwise).
  if (latex.includes("\n")) {
    return { type: "custom", value: `$$\n${latex}\n$$` };
  }
  return { type: "custom", value: `$$${latex}$$` };
};

export const serializeMathInline = (node: JSONContent): MarkdownRepresentation => {
  const latex = String(node.attrs?.latex ?? "");
  if (!latex.includes("$")) {
    return { type: "custom", value: `$${latex}$` };
  }
  return {
    type: "html",
    value: `<span class="rte-math-inline" data-rte-math-inline data-latex="${escapeAttr(latex)}"></span>`,
  };
};

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
