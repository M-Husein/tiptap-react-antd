/**
 * Schema-only CodeBlock — safe for the Viewer's parsing and for
 * createCoreExtensions() (no CodeMirror, no React). The interactive
 * CodeMirror NodeView is layered on top in ./editor/extensions.ts, the
 * same split Image/Embed/Math use, so view-only bundles never load the
 * editing engine (spec section 33).
 *
 * This replaces StarterKit's built-in codeBlock (core.ts disables that
 * one) so the default language is "plaintext" (RULE 19) rather than null.
 */

import BaseCodeBlock, { type CodeBlockOptions as BaseCodeBlockOptions } from "@tiptap/extension-code-block";
import type { CodeBlockRuntimeOptions } from "./types";

export interface CodeBlockExtensionOptions extends BaseCodeBlockOptions, CodeBlockRuntimeOptions {}

/**
 * Reads the language off a `<pre><code class="language-xxx">` element
 * using only `childNodes` and `getAttribute`. The base extension uses
 * `firstElementChild` + `classList`, which zeed-dom (what @tiptap/html's
 * generateJSON parses with — i.e. every `format="html"` / `"markdown"`
 * input) doesn't implement, so there the language silently came back
 * null and every block fell back to the default. Works the same in a
 * real browser DOM.
 */
const languageFromPre = (pre: HTMLElement, prefix: string): string | null => {
  for (const child of Array.from(pre.childNodes)) {
    if ((child as { nodeType: number }).nodeType !== 1) continue;
    const classes = ((child as HTMLElement).getAttribute("class") ?? "").split(/\s+/);
    const hit = classes.find((c) => c.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : null;
  }
  return null;
};

export const CodeBlock = BaseCodeBlock.extend<CodeBlockExtensionOptions>({
  addOptions() {
    return {
      languageClassPrefix: "language-",
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      exitOnArrowUp: true,
      enableTabIndentation: false,
      tabSize: 4,
      HTMLAttributes: {},
      ...this.parent?.(),
      defaultLanguage: "plaintext",
      defaultTheme: "system",
    };
  },

  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      language: {
        ...(parent as Record<string, object>).language,
        default: this.options.defaultLanguage,
        parseHTML: (element: HTMLElement) =>
          languageFromPre(element, this.options.languageClassPrefix ?? "language-"),
      },
    };
  },
});

export const createCodeBlockExtensions = (options?: Partial<CodeBlockExtensionOptions>) => [
  CodeBlock.configure(options ?? {}),
];
