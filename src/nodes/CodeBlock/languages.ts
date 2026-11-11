/**
 * Language registry for CodeBlock (spec 24.14). Deliberately free of any
 * CodeMirror import so the schema, the Viewer, and the language <Select>
 * can all use it without pulling in the editing engine — see
 * scripts/generate-code-languages.mjs for how the data is produced and
 * shared/language-loader.ts for where the real parsers get loaded (lazily).
 */

import { GENERATED_CODE_LANGUAGES, type GeneratedCodeLanguage } from "./languages.generated";

export type CodeLanguage = GeneratedCodeLanguage;

/** The default: no highlighting. Not a CodeMirror language, so not in the generated list. */
export const PLAIN_TEXT: CodeLanguage = { id: "plaintext", label: "Plain text", aliases: ["plain", "text", "txt"] };

/** Every language CodeMirror supports, plus Plain text first. */
export const CODE_LANGUAGES: readonly CodeLanguage[] = [PLAIN_TEXT, ...GENERATED_CODE_LANGUAGES];

/** MUST stay in sync with `slugify` in scripts/generate-code-languages.mjs
 * (`npm run test:codeblock` regenerates the registry and fails if they drift). */
export const slugifyLanguageName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9+#.]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Names editors and tools commonly emit that CodeMirror doesn't list as
 * aliases. VS Code, notably, reports `typescriptreact` / `shellscript`
 * in the clipboard metadata Tiptap's CodeBlock reads on paste.
 */
export const EXTRA_ALIASES: Record<string, string> = {
  typescriptreact: "tsx",
  javascriptreact: "jsx",
  shellscript: "shell",
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  yml: "yaml",
  md: "markdown",
  py: "python",
  rb: "ruby",
  rs: "rust",
  golang: "go",
  ps1: "powershell",
};

const byKey = new Map<string, CodeLanguage>();
for (const lang of CODE_LANGUAGES) {
  byKey.set(lang.id, lang);
  for (const a of lang.aliases) if (!byKey.has(a)) byKey.set(a, lang);
}

/**
 * Resolves whatever a document stores — a canonical id, an alias like
 * `js`, a `language-xxx` class leftover, null — to a registry entry.
 * Returns `null` for names it doesn't know (callers treat that as plain
 * text for highlighting, but should keep showing the raw string).
 *
 * Exact matches only, on purpose: CodeMirror's own `matchLanguageName`
 * has a fuzzy mode that finds aliases as substrings, which would happily
 * map unrelated strings onto real languages.
 */
export const resolveCodeLanguage = (raw: string | null | undefined): CodeLanguage | null => {
  const key = (raw ?? "").trim().toLowerCase().replace(/^language-/, "");
  if (!key) return PLAIN_TEXT;
  return byKey.get(key) ?? byKey.get(EXTRA_ALIASES[key] ?? "") ?? null;
};

/** Display label for any stored language string (raw string if unknown). */
export const codeLanguageLabel = (raw: string | null | undefined): string =>
  resolveCodeLanguage(raw)?.label ?? String(raw);
