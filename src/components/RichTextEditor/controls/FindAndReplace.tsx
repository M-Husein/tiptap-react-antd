/**
 * Scaffold for Phase 10 — Find & Replace.
 *
 * Per spec section 25.1, the real implementation must wrap the official
 * Tiptap Find & Replace extension (not a custom search implementation),
 * and it is an Editor-only control (never on RichTextViewer).
 *
 * This stub exists so the project structure documented in the spec
 * (section 12) is present from Phase 1, and so consumers get a clear,
 * actionable error instead of a silently-missing feature if they reach
 * for it before Phase 10 lands.
 */
export const FindAndReplace = (): null => {
  if (import.meta.env?.DEV ?? true) {
    // eslint-disable-next-line no-console
    console.warn(
      "[rte] <FindAndReplace /> is a Phase 10 feature and is not implemented yet. " +
        "Add the official Tiptap Find & Replace extension and wire this control up to it.",
    );
  }
  return null;
};
