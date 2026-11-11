import type { JSONContent } from "@tiptap/core";

/** JSON is the canonical model itself, so this is close to identity — but
 * we still validate the minimal doc shape so bad input fails loudly and
 * early instead of producing a confusing ProseMirror error deeper in. */
export const assertDocShape = (value: unknown): JSONContent => {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as JSONContent).type !== "doc"
  ) {
    throw new Error(
      '[rte] Invalid content for format="json": expected a Tiptap/ProseMirror document node ({ type: "doc", content: [...] }).',
    );
  }
  return value as JSONContent;
};

export const emptyDoc = (): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
