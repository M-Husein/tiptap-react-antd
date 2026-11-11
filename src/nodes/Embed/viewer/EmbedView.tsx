import { EmbedFrame } from "../shared/EmbedFrame";
import type { NodeRenderer } from "../../../viewer/renderer/nodes";
import type { EmbedValidationOptions } from "../security";

/**
 * Factory (not a plain object like the other registries) because the
 * viewer may need its own `allowedCustomOrigins` — pass it through if
 * you're using provider "custom" embeds.
 */
export const createEmbedNodeRenderers = (
  validation?: EmbedValidationOptions,
): Record<string, NodeRenderer> => ({
  embed: (node, key) => (
    <EmbedFrame
      key={key}
      src={String(node.attrs?.src ?? "")}
      provider={node.attrs?.provider ?? "custom"}
      width={node.attrs?.width}
      height={node.attrs?.height}
      title={node.attrs?.title}
      validation={validation}
    />
  ),
});
