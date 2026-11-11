import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

export type MarkRenderer = (
  attrs: Record<string, unknown> | undefined,
  children: ReactNode,
  key: string,
) => ReactNode;

/**
 * Phase 1 marks. Phase 4 (color, highlight, font family/size, line height)
 * and beyond extend this registry rather than replacing it — see
 * `mergeMarkRenderers` below.
 */
export const defaultMarkRenderers: Record<string, MarkRenderer> = {
  bold: (_attrs, children, key) => <strong key={key}>{children}</strong>,
  italic: (_attrs, children, key) => <em key={key}>{children}</em>,
  underline: (_attrs, children, key) => <u key={key}>{children}</u>,
  strike: (_attrs, children, key) => <s key={key}>{children}</s>,
  code: (_attrs, children, key) => <code key={key}>{children}</code>,
  link: (attrs, children, key) => (
    <a
      key={key}
      href={String(attrs?.href ?? "")}
      target={attrs?.target ? String(attrs.target) : undefined}
      rel={attrs?.rel ? String(attrs.rel) : undefined}
      tabIndex={attrs?.tabIndex != null ? Number(attrs.tabIndex) : undefined}
      title={attrs?.title ? String(attrs.title) : undefined}
      aria-label={attrs?.ariaLabel ? String(attrs.ariaLabel) : undefined}
    >
      {children}
    </a>
  ),
};

export const mergeMarkRenderers = (
  overrides?: Record<string, MarkRenderer>,
): Record<string, MarkRenderer> => ({
  ...defaultMarkRenderers,
  ...overrides,
});

export const renderMarks = (
  marks: JSONContent["marks"],
  children: ReactNode,
  registry: Record<string, MarkRenderer>,
  keyPrefix: string,
): ReactNode =>
  (marks ?? []).reduce<ReactNode>((acc, mark, index) => {
    const renderer = registry[mark.type];
    if (!renderer) return acc; // unknown mark: degrade gracefully, keep text
    return renderer(mark.attrs, acc, `${keyPrefix}-mark-${mark.type}-${index}`);
  }, children);
