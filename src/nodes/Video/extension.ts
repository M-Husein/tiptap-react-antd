/**
 * Video node (spec section 20). Renders a native <video> element for a
 * direct video file URL (self-hosted or CDN). For YouTube/Vimeo/etc use
 * the Embed node instead (src/nodes/Embed) — those are iframes, not
 * <video src>, and need the provider allowlist/sanitization Embed does.
 */

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: {
        src: string;
        poster?: string;
        width?: number;
        height?: number;
      }) => ReturnType;
    };
  }
}

export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const noAutoRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      src: { default: null, ...noAutoRender },
      poster: { default: null, ...noAutoRender },
      width: { default: null, ...noAutoRender },
      height: { default: null, ...noAutoRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[src]",
        getAttrs: (el) => {
          const node = el as HTMLVideoElement;
          return {
            src: node.getAttribute("src"),
            poster: node.getAttribute("poster"),
            width: node.getAttribute("width") ? Number(node.getAttribute("width")) : null,
            height: node.getAttribute("height") ? Number(node.getAttribute("height")) : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, poster, width, height } = node.attrs;
    return [
      "video",
      mergeAttributes({
        src,
        poster: poster ?? undefined,
        width: width ?? undefined,
        height: height ?? undefined,
        controls: "true",
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const createVideoExtensions = () => [Video];
