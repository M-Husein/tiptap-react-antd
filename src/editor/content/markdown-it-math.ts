/**
 * A small, self-written markdown-it plugin recognizing the `$...$` /
 * `$$...$$` math convention (see nodes/Math/markdown.ts for why this
 * syntax and not something else) and rendering it to the same
 * `data-rte-math(-inline)` marker HTML that nodes/Math/extension.ts's
 * parseHTML rules already know how to read — this is what makes
 * `$x^2$` round-trip through markdownToJson (markdown -> HTML via
 * markdown-it -> JSON) back into an actual math node, rather than being
 * silently swallowed as plain text (which is what would happen without
 * this: markdown-it has no built-in concept of math).
 *
 * Deliberately not a generic/robust implementation — see the two
 * documented restrictions below — in favor of staying a small, dependency-
 * free addition rather than pulling in a third-party markdown-it math
 * plugin for a feature narrower than most of those support anyway.
 */

import type { MarkdownIt, StateBlock, StateInline } from "markdown-it";

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * Block rule: a line starting with `$$`. Either the whole block is on
 * one line (`$$x^2$$`), or it opens on a line that is *exactly* `$$`
 * and closes on a later line that is also exactly `$$`, with every line
 * between them taken verbatim as the latex (preserving internal
 * newlines — multi-line LaTeX, e.g. `\begin{aligned}...\end{aligned}`,
 * needs this).
 */
const mathBlockRule = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(start, max);
  const trimmed = line.trim();

  if (!trimmed.startsWith("$$")) return false;

  // Single-line form: $$...$$ with real content between the delimiters.
  if (trimmed.length > 4 && trimmed.endsWith("$$")) {
    if (silent) return true;
    const latex = trimmed.slice(2, -2);
    const token = state.push("math_block", "div", 0);
    token.content = latex;
    token.map = [startLine, startLine + 1];
    state.line = startLine + 1;
    return true;
  }

  // Multi-line form requires the opening line to be bare `$$`.
  if (trimmed !== "$$") return false;

  let nextLine = startLine + 1;
  let closed = false;
  while (nextLine < endLine) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineMax = state.eMarks[nextLine];
    if (state.src.slice(lineStart, lineMax).trim() === "$$") {
      closed = true;
      break;
    }
    nextLine += 1;
  }
  if (!closed) return false; // unterminated — fall through to normal paragraph handling
  if (silent) return true;

  const contentLines: string[] = [];
  for (let i = startLine + 1; i < nextLine; i += 1) {
    // bMarks (not bMarks + tShift) on purpose: tShift is the leading
    // whitespace markdown-it treats as block-structural indentation and
    // skips — using it here would silently strip meaningful leading
    // whitespace from the LaTeX itself (e.g. an indented \begin{aligned}
    // body), corrupting content that must round-trip byte-for-byte.
    contentLines.push(state.src.slice(state.bMarks[i], state.eMarks[i]));
  }

  const token = state.push("math_block", "div", 0);
  token.content = contentLines.join("\n");
  token.map = [startLine, nextLine + 1];
  state.line = nextLine + 1;
  return true;
};

/**
 * Inline rule: `$...$` with no closing `$$` collision (a bare `$$`
 * mid-line is left alone — block math must start its own line) and no
 * leading/trailing whitespace right inside the delimiters (the standard
 * heuristic, also used by Pandoc, for not treating "$5 and $10" as math).
 */
const mathInlineRule = (state: StateInline, silent: boolean): boolean => {
  const src = state.src;
  const start = state.pos;
  if (src[start] !== "$" || src[start + 1] === "$") return false;

  let pos = start + 1;
  while (pos < state.posMax) {
    if (src[pos] === "$" && src[pos - 1] !== "\\") break;
    pos += 1;
  }
  if (pos >= state.posMax || pos === start + 1) return false;

  const latex = src.slice(start + 1, pos);
  if (/^\s/.test(latex) || /\s$/.test(latex)) return false;

  if (!silent) {
    const token = state.push("math_inline", "span", 0);
    token.content = latex;
  }
  state.pos = pos + 1;
  return true;
};

export const mathMarkdownItPlugin = (md: MarkdownIt): void => {
  md.block.ruler.before("fence", "math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.inline.ruler.before("escape", "math_inline", mathInlineRule);

  md.renderer.rules.math_block = (tokens, idx) => {
    const latex = tokens[idx].content;
    return `<div class="rte-math" data-rte-math data-display="true" data-latex="${escapeAttr(latex)}"></div>\n`;
  };
  md.renderer.rules.math_inline = (tokens, idx) => {
    const latex = tokens[idx].content;
    return `<span class="rte-math-inline" data-rte-math-inline data-latex="${escapeAttr(latex)}"></span>`;
  };
};
