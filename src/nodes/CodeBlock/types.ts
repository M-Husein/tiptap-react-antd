/**
 * CodeBlock (spec section 24). Document data vs. runtime state, per spec
 * 24.16: the *language* is persisted on the node; the *theme* is a
 * runtime preference and never enters the document (RULE 15).
 */

/** "system" follows the OS light/dark preference live. Exactly these three (RULE 14). */
export type CodeBlockTheme = "system" | "light" | "dark";

/** Persisted node attributes. `language` is a registry id or alias (see languages.ts). */
export interface CodeBlockAttributes {
  language: string;
}

/** Developer-configurable defaults (spec 24.15 / RULE 12). Runtime-only: never persisted. */
export interface CodeBlockRuntimeOptions {
  /** Initial theme for each code block. Default "system". */
  defaultTheme: CodeBlockTheme;
}
