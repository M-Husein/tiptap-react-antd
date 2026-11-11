/**
 * Embed node (spec 20.1). Stores semantic `{ src, provider, width, height,
 * title }` — never raw iframe HTML (RULE 29). The actual iframe `src` put
 * on the page is always re-derived through security.ts's `resolveEmbed`,
 * both when rendering and when parsing untrusted HTML/markdown back in,
 * so a maliciously crafted `<iframe>` pasted into markdown can't smuggle
 * an arbitrary origin/protocol through.
 */

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import {
  resolveEmbed,
  EMBED_SANDBOX,
  type EmbedProvider,
  type EmbedValidationOptions,
} from "./security";
import { styleAttrs } from "../../editor/content/style-attr";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (attrs: {
        src: string;
        provider: EmbedProvider;
        width?: number;
        height?: number;
        title?: string;
      }) => ReturnType;
    };
  }
}

export interface EmbedExtensionOptions extends EmbedValidationOptions {}

export const Embed = Node.create<EmbedExtensionOptions>({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { allowedCustomOrigins: [] };
  },

  addAttributes() {
    const noAutoRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      src: { default: null, ...noAutoRender },
      provider: { default: "custom", ...noAutoRender },
      width: { default: 560, ...noAutoRender },
      height: { default: 315, ...noAutoRender },
      title: { default: null, ...noAutoRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe[data-rte-embed]",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            src: node.getAttribute("data-src") ?? node.getAttribute("src"),
            provider: node.getAttribute("data-provider") ?? "custom",
            width: node.getAttribute("width") ? Number(node.getAttribute("width")) : 560,
            height: node.getAttribute("height") ? Number(node.getAttribute("height")) : 315,
            title: node.getAttribute("title"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, provider, width, height, title } = node.attrs;
    const resolved = resolveEmbed(src ?? "", provider, this.options);
    const w = width ?? 560;
    const h = height ?? 315;

    if (!resolved) {
      // Fails safe: render nothing embeddable rather than an iframe with
      // an unvalidated src. The document still keeps the original attrs
      // (so re-editing/re-validating later is possible), it just doesn't
      // render as a live iframe.
      return [
        "div",
        mergeAttributes({
          "data-rte-embed-blocked": "",
          "data-src": src ?? "",
        }),
        `Embed blocked: could not validate "${src ?? ""}" for provider "${provider}".`,
      ];
    }

    // Same responsive shape as the shared EmbedFrame component (spec 8.1:
    // Editor and Viewer must render content visually the same) — full
    // width, height derived from the aspect ratio rather than a fixed
    // pixel box. `width`/`height` stay on the iframe as plain HTML
    // attributes purely so they round-trip on re-parse; the inline style
    // is what actually controls rendered size.
    return [
      "div",
      { class: "rte-embed", ...styleAttrs(`aspect-ratio:${w}/${h}`) },
      [
        "iframe",
        mergeAttributes({
          src: resolved.embedSrc,
          "data-rte-embed": "",
          "data-src": src,
          "data-provider": provider,
          width: w,
          height: h,
          title: title ?? undefined,
          sandbox: EMBED_SANDBOX,
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          loading: "lazy",
          frameborder: "0",
          ...styleAttrs("width:100%;height:100%;border:0"),
        }),
      ],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const createEmbedExtensions = (options?: EmbedExtensionOptions) => [
  Embed.configure(options ?? {}),
];
