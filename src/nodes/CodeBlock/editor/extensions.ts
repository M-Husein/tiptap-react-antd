/**
 * Editor-only CodeBlock — the CodeMirror NodeView layered over the
 * schema-only extension (../extension.ts), mirroring Image/Embed/Math's
 * split so view-only bundles never load the editing engine (spec 33).
 *
 * Opt-in like the other node features, but needs no special wiring beyond
 * putting it in `extensions`: it shares the name `codeBlock` with the
 * schema-only block that `createCoreExtensions()` ships, and
 * `mergeExtensions` swaps it in place.
 */
import { CodeBlock, type CodeBlockExtensionOptions } from "../extension";
import { CodeBlockView } from "./CodeBlockView";

export const createCodeBlockEditorExtensions = (options?: Partial<CodeBlockExtensionOptions>) => [
  CodeBlock.extend({
    addNodeView() {
      return ({ node, editor, getPos }) =>
        new CodeBlockView({
          node,
          editor,
          getPos: getPos as () => number | undefined,
          defaultTheme: this.options.defaultTheme,
        });
    },
  }).configure(options ?? {}),
];
