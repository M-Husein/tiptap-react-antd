import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/core";

export interface RichTextEditorContextValue {
  editor: Editor | null;
}

export const RichTextEditorContext = createContext<RichTextEditorContextValue>(
  { editor: null },
);

/**
 * Used by editor controls (Bold, Italic, Link, ...) and by any consumer
 * component placed inside <RichTextEditor>. Controls are NOT a toolbar
 * (RULE 4/5) — consumers decide layout, this context just gives whatever
 * they render access to the live editor instance.
 */
export const useRichTextEditor = (): Editor | null =>
  useContext(RichTextEditorContext).editor;
