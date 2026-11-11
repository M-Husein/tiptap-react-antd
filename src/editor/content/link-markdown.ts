/**
 * Link markdown capability check (per the Link spec: "Link Markdown
 * Capability" / "Link Serialization Rules"). `href` and `title` are
 * native-Markdown compatible; `target`, `rel`, `tabIndex`, `ariaLabel`
 * are not representable in any Markdown dialect and force HTML.
 */

export interface LinkAttrs {
  href?: string | null;
  target?: string | null;
  rel?: string | null;
  tabIndex?: number | null;
  title?: string | null;
  ariaLabel?: string | null;
}

export interface LinkMarkdownInfo {
  isSimple: boolean;
  /** `href` or `href "title"` — the part that goes inside `(...)` in `[text](...)`. */
  hrefPart: string;
  /** Every link attribute as a set of HTML attribute strings, for the `<a ...>` opening tag. */
  htmlOpenTag: string;
}

export const describeLinkForMarkdown = (attrs: LinkAttrs = {}): LinkMarkdownInfo => {
  const { href, target, rel, tabIndex, title, ariaLabel } = attrs;

  const isSimple = !target && !rel && tabIndex == null && !ariaLabel;

  const hrefPart = title ? `${href ?? ""} "${title}"` : href ?? "";

  const attrPairs = [
    `href="${href ?? ""}"`,
    target ? `target="${target}"` : "",
    rel ? `rel="${rel}"` : "",
    tabIndex != null ? `tabindex="${tabIndex}"` : "",
    title ? `title="${title}"` : "",
    ariaLabel ? `aria-label="${ariaLabel}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { isSimple, hrefPart, htmlOpenTag: `<a ${attrPairs}>` };
};
