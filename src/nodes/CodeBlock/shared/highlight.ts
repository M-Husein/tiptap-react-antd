import { loadCodeLanguage } from "./language-loader";

export interface HighlightToken {
  text: string;
  /** CodeMirror's stock `tok-*` class names (see content.css), or "" for unstyled text. */
  cls: string;
}
export type HighlightedLine = HighlightToken[];

/** Unhighlighted lines — also what the Viewer shows while a language loads. */
export const plainLines = (code: string): HighlightedLine[] =>
  code.split("\n").map((text) => (text ? [{ text, cls: "" }] : []));

/**
 * Highlights `code` without creating any editor: parse with the language's
 * Lezer parser, then walk the tree with `@lezer/highlight`. The classes
 * are the same `tok-*` ones the Editor's CodeMirror emits (it uses the same
 * `classHighlighter`), so one stylesheet colors both and they can't drift.
 * Resolves to `null` when there's nothing to highlight with.
 */
export const highlightLines = async (
  code: string,
  language: string | null | undefined,
): Promise<HighlightedLine[] | null> => {
  const support = await loadCodeLanguage(language);
  if (!support) return null;
  const { highlightCode, classHighlighter } = await import("@lezer/highlight");

  const tree = support.language.parser.parse(code);
  const lines: HighlightedLine[] = [[]];
  highlightCode(
    code,
    tree,
    classHighlighter,
    (text, cls) => lines[lines.length - 1].push({ text, cls }),
    () => lines.push([]),
  );
  return lines;
};
