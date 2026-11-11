import { VideoPlayer } from "../shared/VideoPlayer";
import type { NodeRenderer } from "../../../viewer/renderer/nodes";

export const videoNodeRenderers: Record<string, NodeRenderer> = {
  video: (node, key) => (
    <VideoPlayer
      key={key}
      src={String(node.attrs?.src ?? "")}
      poster={node.attrs?.poster}
      width={node.attrs?.width}
      height={node.attrs?.height}
    />
  ),
};
