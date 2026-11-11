import { convertLatexToMarkup } from "mathlive/ssr";

export interface MathViewProps {
  latex: string;
  display?: boolean;
  className?: string;
}

/**
 * Pure presentation — typesets `latex` to static markup via MathLive's
 * `convertLatexToMarkup` (from the DOM-free `mathlive/ssr` entry point,
 * not the main `mathlive` package — this function needs no browser APIs,
 * which is what lets this component run identically in the Viewer, in
 * the Editor's collapsed/non-editing display state, and in Node-based
 * tooling like scripts/smoke-test-content.ts with zero environment
 * differences).
 *
 * Requires the consumer to load MathLive's stylesheet for the output to
 * actually look like typeset math — see this package's README ("Adding
 * Math") for the exact imports. `convertLatexToMarkup` only returns a
 * string of HTML class names; it does not inject any CSS itself.
 */
export const MathView = ({ latex, display = false, className }: MathViewProps) => {
  const markup = convertLatexToMarkup(latex || "", {
    // MathLive's actual type here is 'math' | 'inline-math' | 'text'
    // (the same enum MathfieldElement.defaultMode uses) — the package's
    // own doc comment for this function says "displaystyle"/"textstyle",
    // which is stale/wrong against the shipped .d.ts; verified directly
    // against node_modules/mathlive/types/options.d.ts.
    defaultMode: display ? "math" : "inline-math",
  });

  const Tag = display ? "div" : "span";

  return (
    <Tag
      className={[display ? "rte-math" : "rte-math-inline", className]
        .filter(Boolean)
        .join(" ")}
      // eslint-disable-next-line react/no-danger -- MathLive's own typeset
      // output (spans/classes), not user-supplied HTML; latex itself is
      // never interpreted as markup by convertLatexToMarkup.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
};
