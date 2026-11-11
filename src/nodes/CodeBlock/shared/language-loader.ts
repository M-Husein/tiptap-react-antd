import type { LanguageSupport } from "@codemirror/language";
import { resolveCodeLanguage, slugifyLanguageName } from "../languages";

const cache = new Map<string, Promise<LanguageSupport | null>>();

/**
 * Lazily loads the CodeMirror language package for a stored language
 * string (id, alias, or unknown). Resolves to `null` for plain text and
 * for names CodeMirror doesn't know — callers render those unhighlighted.
 *
 * Everything CodeMirror is behind `import()` here, so the schema, the
 * Viewer's static import graph, and the `<Select>` never load it; a
 * parser is fetched only when a block in that language is actually shown.
 * (`import type` above is erased at build time.) Cached per language.
 */
export const loadCodeLanguage = (raw: string | null | undefined): Promise<LanguageSupport | null> => {
  const entry = resolveCodeLanguage(raw);
  if (!entry || entry.id === "plaintext") return Promise.resolve(null);

  let pending = cache.get(entry.id);
  if (!pending) {
    pending = import("@codemirror/language-data")
      .then(({ languages }) => {
        const desc = languages.find((d) => slugifyLanguageName(d.name) === entry.id);
        return desc ? desc.load() : null;
      })
      .catch((err) => {
        cache.delete(entry.id); // allow a retry (e.g. a transient network failure)
        throw err;
      });
    cache.set(entry.id, pending);
  }
  return pending;
};
