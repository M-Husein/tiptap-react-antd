/**
 * Image extension (spec section 19). Two underlying node types because a
 * single Tiptap node cannot switch between block and inline schema
 * behavior based on an attribute (RULE 23):
 *   - `image`        -> block / float-left / float-right
 *   - `imageInline`   -> inline, character-like, supports verticalAlign
 *
 * Pre-upload editing (crop/rotate/flip/source-resize) and the upload
 * pipeline itself (spec 19.1) are application/back-end concerns and are
 * intentionally NOT implemented here — this extension only owns the
 * *document representation* of an already-uploaded image. Consumers wire
 * their own upload flow and call `setImage({ src })` once they have a URL.
 */

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import type { ImageAlign, ImageDisplayMode, ImageVerticalAlign } from "./types";
import { styleAttrs } from "../../editor/content/style-attr";

/**
 * Markdown has no way to express block-vs-inline for `![alt](src)` — and
 * even our own HTML fallback always ends up wrapped in a `<p>` once it
 * round-trips through markdown-it (CommonMark always wraps images in a
 * paragraph). So a bare `<img>` is ambiguous by itself; the only signal
 * left is *context*: is this image the only meaningful thing in its
 * containing block (→ it was a standalone block image), or does it sit
 * alongside other text/images in the same block (→ it was inline, and
 * quite possibly wrapped in a Link mark, e.g. `<a href><img></a>`)?
 *
 * This walks up past mark-wrapper elements (the tags our own marks
 * render, like the Link mark's `<a>`) to find the nearest real block
 * container, then checks whether `el` (or the wrapper chain around it)
 * is that container's only non-whitespace child.
 */
const MARK_WRAPPER_TAGS = new Set(["A", "STRONG", "EM", "U", "S", "CODE"]);

/** zeed-dom (the lightweight parser @tiptap/html uses for generateJSON)
 * implements `parentNode` but not `parentElement`/`Element.contains` — so
 * this walks `parentNode` and does its own containment check rather than
 * relying on those DOM methods. */
const findBlockContainer = (el: HTMLElement): HTMLElement | null => {
  let node: HTMLElement | null = (el as unknown as { parentNode?: HTMLElement }).parentNode ?? null;
  while (node && MARK_WRAPPER_TAGS.has(node.tagName)) {
    node = (node as unknown as { parentNode?: HTMLElement }).parentNode ?? null;
  }
  return node;
};

const containsNode = (root: HTMLElement, target: HTMLElement): boolean => {
  if (root === target) return true;
  const children = (root as unknown as { childNodes?: HTMLElement[] }).childNodes;
  if (!children) return false;
  for (const child of Array.from(children)) {
    if (containsNode(child as HTMLElement, target)) return true;
  }
  return false;
};

const isSoleBlockContent = (el: HTMLElement): boolean => {
  const container = findBlockContainer(el);
  if (!container) return true; // no wrapper at all — treat as standalone
  // The block/inline ambiguity only exists inside a <p>: markdown (and
  // markdown-it's HTML rendering) always wraps images in a paragraph
  // regardless of whether they were meant as standalone or inline, so a
  // lone image sharing a <p> with nothing else is ambiguous. Any other
  // container — the document root, a <li>, a <blockquote>, a <td> — is
  // unambiguous: a plain top-level image sitting among many *sibling*
  // blocks (e.g. Tiptap's own generateHTML output, which doesn't wrap
  // block nodes in <p>) is still a block image even though its container
  // has many other children.
  if (container.tagName !== "P") return true;
  const meaningful = Array.from(
    (container as unknown as { childNodes: (HTMLElement | { nodeType: number; textContent?: string })[] }).childNodes,
  ).filter((n) => {
    if ((n as { nodeType: number }).nodeType === 3) {
      return Boolean((n as { textContent?: string }).textContent?.trim());
    }
    return true;
  });
  if (meaningful.length !== 1) return false;
  const only = meaningful[0] as HTMLElement;
  return only === el || containsNode(only, el);
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (attrs: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        displayMode?: ImageDisplayMode;
        align?: ImageAlign;
        width?: number;
        height?: number;
      }) => ReturnType;
      updateImage: (attrs: Record<string, unknown>) => ReturnType;
    };
    imageInline: {
      setImageInline: (attrs: {
        src: string;
        alt?: string;
        width?: number;
        verticalAlign?: ImageVerticalAlign;
      }) => ReturnType;
    };
  }
}

export const Image = Node.create({
  name: "image",
  group: "block",
  draggable: true,
  isolating: true,
  // Allows the Link mark to wrap a block image (spec: "Image Inside
  // Link" — Link content MAY be an Image, and the rule applies the same
  // regardless of standalone vs inline placement). Restricted to just
  // "link" rather than "_" (all marks) since bold/italic/etc. on an image
  // node has no meaning.
  marks: "link",

  addAttributes() {
    const noRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      src: { default: null, ...noRender },
      alt: { default: null, ...noRender },
      title: { default: null, ...noRender },
      caption: { default: null, ...noRender },
      displayMode: { default: "block", ...noRender },
      align: { default: "center", ...noRender },
      width: { default: null, ...noRender },
      height: { default: null, ...noRender },
      responsive: { default: null, ...noRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-rte-image]",
        getAttrs: (el) => {
          const figure = el as HTMLElement;
          const img = figure.querySelector("img");
          const figcaption = figure.querySelector("figcaption");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.getAttribute("width") ? Number(img.getAttribute("width")) : null,
            height: img.getAttribute("height") ? Number(img.getAttribute("height")) : null,
            align: figure.getAttribute("data-align") ?? "center",
            displayMode: figure.getAttribute("data-display-mode") ?? "block",
            caption: figcaption ? figcaption.textContent : null,
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          if (node.hasAttribute("data-rte-inline")) return false;
          // Ambiguous bare <img>: only claim it as a block image when it's
          // the sole meaningful content of its block (see isSoleBlockContent
          // above) — otherwise it sits alongside other inline content
          // (text, another image, a Link wrapper) and belongs to
          // ImageInline instead.
          if (!isSoleBlockContent(node)) return false;
          return {
            src: node.getAttribute("src"),
            alt: node.getAttribute("alt"),
            title: node.getAttribute("title"),
            width: node.getAttribute("width") ? Number(node.getAttribute("width")) : null,
            height: node.getAttribute("height") ? Number(node.getAttribute("height")) : null,
            align: node.getAttribute("data-align") ?? "center",
            displayMode: node.getAttribute("data-display-mode") ?? "block",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { src, alt, title, caption, align, displayMode, width, height } = node.attrs;
    const img = [
      "img",
      mergeAttributes({ src, alt, title, width: width ?? undefined, height: height ?? undefined }),
    ];
    if (!caption && displayMode === "block" && align === "center" && !width && !height) {
      // Simple case: bare <img>, no figure wrapper needed.
      return img as any;
    }
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-rte-image": "",
        "data-align": align,
        "data-display-mode": displayMode,
      }),
      img as any,
      ...(caption ? [["figcaption", {}, caption]] : []),
    ] as any;
  },

  addCommands() {
    return {
      setImage:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
      updateImage:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});

export const ImageInline = Node.create({
  name: "imageInline",
  group: "inline",
  inline: true,
  draggable: true,
  // See the `image` node above — Link is the one mark that makes sense
  // on an image.
  marks: "link",

  addAttributes() {
    const noRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      src: { default: null, ...noRender },
      alt: { default: null, ...noRender },
      width: { default: null, ...noRender },
      verticalAlign: { default: "baseline", ...noRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
        // Claims a bare <img> when either (a) it was rendered by our own
        // renderHTML with the explicit data-rte-inline marker, or (b)
        // context shows it's NOT the sole content of its block — i.e. the
        // `image` (block) rule above already declined it. Together the two
        // rules are exhaustive and non-overlapping for the actual figure
        // case; see the isSoleBlockContent comment in this file.
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const explicit = node.hasAttribute("data-rte-inline");
          if (!explicit && isSoleBlockContent(node)) return false;
          return {
            src: node.getAttribute("src"),
            alt: node.getAttribute("alt"),
            width: node.getAttribute("width") ? Number(node.getAttribute("width")) : null,
            verticalAlign: node.style.verticalAlign || "baseline",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, width, verticalAlign } = node.attrs;
    return [
      "img",
      mergeAttributes({
        src,
        alt,
        width,
        "data-rte-inline": "",
        ...styleAttrs(verticalAlign && verticalAlign !== "baseline" ? `vertical-align:${verticalAlign}` : null),
      }),
    ] as any;
  },

  addCommands() {
    return {
      setImageInline:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const createImageExtensions = () => [Image, ImageInline];
