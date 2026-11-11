/**
 * Math node (spec section 21). Stores semantic `{ latex }` only — not
 * pre-rendered markup. The actual typeset visual (via MathLive's
 * `convertLatexToMarkup`) happens in shared/MathView.tsx at display time,
 * used identically by the Editor's NodeView and the Viewer (spec 8.1).
 *
 * This mirrors Embed's "store the data, not the rendering" choice (see
 * nodes/Embed/extension.ts's comment) even though Math has no security
 * reason to avoid baking rendered markup in — keeping one rendering path
 * instead of two is simpler and means a LaTeX typo or a future MathLive
 * version upgrade only ever needs fixing in one place. The practical
 * consequence: a `format="html"` export is semantic data for *this*
 * library to re-render, not a standalone visual artifact you could open
 * in a plain browser with no JS and expect to see typeset math — same
 * trade-off Embed makes for the same reason.
 */

import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      setMath: (attrs: { latex: string }) => ReturnType;
      updateMath: (attrs: { latex: string }) => ReturnType;
    };
    mathInline: {
      setMathInline: (attrs: { latex: string }) => ReturnType;
    };
  }
}

export const Math = Node.create({
  name: "math",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const noAutoRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      latex: { default: "", ...noAutoRender },
      display: { default: true, ...noAutoRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-rte-math]",
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute("data-latex") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        class: "rte-math",
        "data-rte-math": "",
        "data-display": "true",
        "data-latex": node.attrs.latex ?? "",
      }),
    ];
  },

  addCommands() {
    return {
      setMath:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs: { ...attrs, display: true } }),
      updateMath:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    const noAutoRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      latex: { default: "", ...noAutoRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-rte-math-inline]",
        getAttrs: (el) => ({
          latex: (el as HTMLElement).getAttribute("data-latex") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      mergeAttributes({
        class: "rte-math-inline",
        "data-rte-math-inline": "",
        "data-latex": node.attrs.latex ?? "",
      }),
    ];
  },

  addCommands() {
    return {
      setMathInline:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const createMathExtensions = () => [Math, MathInline];
