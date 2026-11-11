import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../../editor/types";

/**
 * Fenced code block, native CommonMark (spec 5.1 — no fallback needed:
 * language is the only attribute, and the info string carries it).
 *
 * Two details that matter for round-trip fidelity:
 *  - The fence must be longer than any run of backticks *inside* the code,
 *    otherwise a line of ``` in the content closes the block early and
 *    silently truncates/corrupts it. (CommonMark's rule: a closing fence
 *    needs at least as many backticks as the opener.)
 *  - "plaintext" is the default, so it's omitted from the info string —
 *    a plain block stays a plain ``` fence instead of ```plaintext.
 */
export const serializeCodeBlock = (node: JSONContent): MarkdownRepresentation => {
  const code = (node.content ?? []).map((t) => t.text ?? "").join("");
  const language = String(node.attrs?.language ?? "").trim();
  const info = language && language !== "plaintext" ? language : "";

  const longestRun = (code.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));

  return { type: "native", value: `${fence}${info}\n${code}\n${fence}` };
};
