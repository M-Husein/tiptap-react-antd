/**
 * Semantic Image types (spec section 19). Framework-independent: no
 * Tailwind class names or CSS strings are stored as canonical data
 * (RULE 27) — only semantic values that presentation adapters translate.
 */

export type ImageDisplayMode = "block" | "float-left" | "float-right";

export type ImageAlign = "left" | "center" | "right";

export type ImageVerticalAlign =
  | "baseline"
  | "sub"
  | "super"
  | "text-top"
  | "text-bottom"
  | "middle"
  | "top"
  | "bottom"
  | (string & {});

export type ImageWidth = "auto" | "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";

export interface ImageResponsive {
  sm?: ImageWidth;
  md?: ImageWidth;
  lg?: ImageWidth;
  xl?: ImageWidth;
}

/** Block/float image attributes (spec 19.9). */
export interface ImageAttributes {
  src: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  displayMode?: ImageDisplayMode;
  align?: ImageAlign;
  width?: number | null;
  height?: number | null;
  responsive?: ImageResponsive | null;
}

/** Inline image attributes (spec 19.6/19.7). Separate node type because
 * Tiptap/ProseMirror cannot switch a single node between block and inline
 * schema behavior based on an attribute (RULE 23). */
export interface ImageInlineAttributes {
  src: string;
  alt?: string | null;
  width?: number | null;
  verticalAlign?: ImageVerticalAlign;
}
