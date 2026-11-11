/**
 * Emits an inline `style` from a node/mark's `renderHTML` in a way that
 * survives *static* HTML generation (jsonToHtml / `@tiptap/html`'s
 * `generateHTML`), not just the live browser DOM.
 *
 * Why a plain `{ style: "..." }` isn't enough: ProseMirror's
 * `DOMSerializer` special-cases the exact attribute name `"style"` and
 * applies it with `dom.style.cssText = value` instead of `setAttribute`.
 * `generateHTML` serializes into zeed-dom (a lightweight DOM that runs
 * without a browser), whose `style` object silently ignores `cssText`
 * assignment — so any `style` returned from `renderHTML` vanished from
 * exported HTML. (This is how `ImageInline`'s `vertical-align` was being
 * lost on a JSON -> HTML -> JSON round trip, and how the Embed's
 * responsive wrapper lost its aspect ratio.)
 *
 * The workaround is the attribute name itself: `"STYLE"` is not the
 * string ProseMirror special-cases, so it falls through to a normal
 * `setAttribute`. HTML attribute names are case-insensitive, so browsers
 * (which lowercase names in `setAttribute` on an HTML document) and HTML
 * parsers (zeed-dom's included, verified on re-parse) treat it exactly
 * like `style`. The exported HTML string does contain the literal text
 * `STYLE="..."` — valid, just uppercase. We deliberately don't
 * post-process it back to lowercase with a string replace, because
 * that could corrupt user text that happens to contain ` STYLE="`.
 */
export const styleAttrs = (css?: string | null): Record<string, string> =>
  css ? { STYLE: css } : {};
