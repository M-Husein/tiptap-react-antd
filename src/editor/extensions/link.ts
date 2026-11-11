/**
 * Link mark, extended from the official @tiptap/extension-link to add the
 * attributes the Link modal (src/components/RichTextEditor/controls/Link.tsx)
 * exposes: target, rel, tabIndex, title, ariaLabel — href comes from the
 * base extension.
 *
 * IMPORTANT: this overrides `renderHTML` completely rather than layering
 * attribute-level overrides on top of the base extension's own renderHTML.
 * The base extension's default options are
 * `HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' }`
 * — if we let its renderHTML run, every link would silently get
 * target="_blank" even when the user left Target empty in the modal
 * (Tiptap's `mergeAttributes` only overrides a default when the
 * attribute-level renderHTML actually emits that key). Rendering the tag
 * ourselves, straight from `mark.attrs`, means the modal's fields are the
 * only source of truth.
 */

import TiptapLink from "@tiptap/extension-link";
import { mergeAttributes } from "@tiptap/core";

export const Link = TiptapLink.extend({
  addAttributes() {
    const base = this.parent?.() ?? {};
    // Every added attribute sets renderHTML to a no-op: we build the <a>
    // tag entirely ourselves below, so per-attribute auto-render would
    // just be redundant (and, for href, produce a second copy of the
    // attribute since we handle it directly from mark.attrs too).
    const noAutoRender = { renderHTML: () => ({}) };
    return {
      ...base,
      target: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("target") || null,
        ...noAutoRender,
      },
      rel: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("rel") || null,
        ...noAutoRender,
      },
      tabIndex: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute("tabindex");
          return v !== null && v !== "" ? Number(v) : null;
        },
        ...noAutoRender,
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("title") || null,
        ...noAutoRender,
      },
      ariaLabel: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("aria-label") || null,
        ...noAutoRender,
      },
    };
  },

  renderHTML({ mark }) {
    const { href, target, rel, tabIndex, title, ariaLabel } = mark.attrs as {
      href?: string | null;
      target?: string | null;
      rel?: string | null;
      tabIndex?: number | null;
      title?: string | null;
      ariaLabel?: string | null;
    };
    return [
      "a",
      mergeAttributes({
        href: href ?? undefined,
        target: target || undefined,
        rel: rel || undefined,
        tabindex: tabIndex != null ? String(tabIndex) : undefined,
        title: title || undefined,
        "aria-label": ariaLabel || undefined,
      }),
      0,
    ];
  },
});
