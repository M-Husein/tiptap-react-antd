/**
 * Math (spec section 21). Atomic semantic node — never modeled as an
 * image (RULE 28). Two node types for the same reason Image has two
 * (RULE 23): a single Tiptap node can't switch between block and inline
 * schema behavior, and math genuinely needs both — a standalone centered
 * equation vs. a variable typeset inline with surrounding text.
 */

/** Block/display math — its own line, centered, larger. */
export interface MathAttributes {
  latex: string;
  /** Always true for the block node; kept as an explicit attr (rather
   * than implied by node type alone) because the spec's own JSON example
   * for block math includes it, and because the viewer/markdown layers
   * read it generically. */
  display: true;
}

/** Inline math — typeset within a line of text, like a variable name. */
export interface MathInlineAttributes {
  latex: string;
}
