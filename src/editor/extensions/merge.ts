import type { AnyExtension } from "@tiptap/core";

/**
 * Combines the core extension set with consumer-supplied extensions,
 * letting a consumer extension **replace a core one of the same name** in
 * place — e.g. the NodeView-backed `codeBlock` replacing the schema-only
 * one `createCoreExtensions()` ships.
 *
 * Tiptap tolerates two extensions sharing a name (last one wins) but logs
 * "Duplicate extension names found" and leaves ordering to chance; doing
 * the replacement ourselves is warning-free and keeps the replacement at
 * the original's position in the array, so schema/parse-rule ordering is
 * unchanged. Extensions with no same-named core counterpart are appended.
 */
export const mergeExtensions = (
  core: AnyExtension[],
  extra: AnyExtension[] = [],
): AnyExtension[] => {
  const replacements = new Map<string, AnyExtension>();
  const additions: AnyExtension[] = [];
  const coreNames = new Set(core.map((e) => e.name));
  for (const ext of extra) {
    if (coreNames.has(ext.name)) replacements.set(ext.name, ext);
    else additions.push(ext);
  }
  return [...core.map((e) => replacements.get(e.name) ?? e), ...additions];
};
