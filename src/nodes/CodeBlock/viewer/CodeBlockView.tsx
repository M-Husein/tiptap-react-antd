import { CodeBlockStatic } from "../shared/CodeBlockStatic";
import type { CodeBlockTheme } from "../types";
import type { NodeRenderer } from "../../../viewer/renderer/nodes";

/**
 * Replaces the Viewer's default plain `<pre><code>` with the full block
 * (header + highlighting). A factory, like Embed's, because it carries
 * the developer-configurable runtime default.
 */
export const createCodeBlockNodeRenderers = (
  options: { defaultTheme?: CodeBlockTheme } = {},
): Record<string, NodeRenderer> => ({
  codeBlock: (node, key) => (
    <CodeBlockStatic
      key={key}
      code={(node.content ?? []).map((t) => t.text ?? "").join("")}
      language={String(node.attrs?.language ?? "plaintext")}
      defaultTheme={options.defaultTheme}
    />
  ),
});

export const codeBlockNodeRenderers = createCodeBlockNodeRenderers();
