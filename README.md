# @rte/react — Tiptap + Ant Design Rich Text Editor / Viewer

Implementation of the agreed architecture spec. **Phase 1–3 are fully
implemented and verified** (typechecked, built, and round-trip tested).
**Phase 4 is implemented for Table**; **Phase 5 is implemented for Image**
(block + inline, no upload/crop pipeline — see below); **Phase 6 (Media)**
**Phase 7 (Math, via MathLive)**, and **CodeBlock from Phase 9 (CodeMirror 6)**
are implemented. Phase 8 and the rest of Phase 9 (Emoji, Mention, Footnote,
Details, Callout) and Phase 10 are not started.

## What's real vs. scaffolded

| Phase | Status |
|---|---|
| 1 — Core Editor | ✅ Implemented (marks, lists, task list, link, undo/redo) |
| 2 — Content Formats | ✅ Implemented (JSON canonical, HTML, capability-aware Markdown) |
| 3 — Editor Architecture | ✅ Implemented (RichTextEditor, RichTextViewer, Content, Context, controls) |
| 4 — Basic Rich Content | ⚠️ **Table implemented**; TextAlign/Subscript/Superscript/Highlight/Color/FontFamily/FontSize/LineHeight/CharacterCount/InvisibleCharacters not yet built (each is additive — same pattern as `table.tsx`) |
| 5 — Image | ⚠️ **Implemented**: block image (align, float, caption, alt, width/height) + inline image (verticalAlign). **Not implemented**: pre-upload editor (crop/rotate/flip), the upload pipeline itself, responsive breakpoint rendering (the `responsive` attr round-trips but has no CSS adapter yet) |
| 6 — Media | ✅ **Implemented**: Video (self-hosted `<video>`), Audio (`<audio>`), Embed (YouTube/Vimeo/custom iframe with URL/protocol validation + sandboxing) |
| 7 — Math | ✅ **Implemented** with [MathLive](https://mathlive.io/mathfield/): inline + block math, live `<math-field>` editing in place, insert modal, static typesetting in the Viewer, `$…$` / `$$…$$` Markdown |
| 8 — Diagrams | ❌ Not started |
| 9 — Advanced Content | ⚠️ **CodeBlock implemented** with CodeMirror 6 (language `<Select>` over all 143 CodeMirror languages, theme `<Select>`, copy, line numbers). Emoji / Mention / Footnote / Details / Callout not started |
| 10 — Find & Replace / ToC | ❌ Not started (`<FindAndReplace />` exists as a documented stub) |

## Verified

- `npx tsc --noEmit` passes clean.
- `npm run build` (tsup) produces separate tree-shaken `index`/`editor`/`viewer`
  bundles + `.d.ts` files — the viewer bundle does **not** pull in
  `@tiptap/react`'s editing runtime.
- `scripts/smoke-test-content.ts` round-trips a document containing headings,
  marks, lists, links, a captioned image, and a table through
  `JSON → HTML → JSON` and `JSON → Markdown → JSON` and diffed the results —
  structure, marks, and attributes (including image `caption`/`width` and
  table cells) survive the round trip. Run it yourself:

  ```bash
  npm install
  npx tsx scripts/smoke-test-content.ts
  ```

## Quick start

```bash
npm install
npm run build      # builds dist/
npm run dev         # runs the full-feature demo app (example/) via Vite
```

The demo (`example/App.tsx`) wires up **every control and node type
currently implemented** (Phase 1–6) into one real, consumer-owned toolbar
— open it after `npm run dev` to see Table/Image/Video/Audio/Embed
insertion, format switching (JSON/HTML/Markdown), and the Editor/Viewer
toggle side by side. It's also the basis for two automated checks:

```bash
npm test                  # everything below, in order, as a single gate
npm run test:content      # round-trips a full document through every format
npm run test:math-editor  # Math NodeView + insert modal against the REAL MathLive widget
npm run test:codeblock    # language registry, content round trips, real ProseMirror + real CodeMirror
npm run test:codeblock-ui # Viewer code block + header, driving the real antd Selects
npm run generate:code-languages  # regenerate the language list after upgrading @codemirror/language-data
npm run check:viewer-bundle  # builds, then fails if the Viewer's import graph reaches editor-only code
npm run test:demo-render  # headless-renders the actual demo App and checks output
```

`test:demo-render` uses `happy-dom` rather than a real browser, so it
can't fully mount ProseMirror's `EditorView` (which relies on browser
Selection/Range APIs happy-dom doesn't fully implement) — Table renders
fine there, but Image/Embed/Video/Audio don't show up in that specific
headless check even though they work in a real browser. The script
verifies this is a test-harness gap, not a library bug, by also rendering
the same content through `RichTextViewer` (no ProseMirror involved) in
the same run, where they render correctly. `@ant-design/icons` has the
same kind of gap independently — every icon (not just ones added
recently) throws in a `useEffect` under `happy-dom`, so toolbar buttons
render but without their icon glyph in this specific harness. See the
script's output and comments for details; a real browser check (e.g.
Playwright) would close both gaps if you need full editor-mount coverage
in CI.

```tsx
import { RichTextEditor, Content, Bold, Italic, Link } from "@rte/react/editor";
import { RichTextViewer } from "@rte/react/viewer";
import "@rte/react/styles/content.css";
import "@rte/react/styles/editor.css";

function Example({ value, onChange, canEdit }) {
  return canEdit ? (
    <RichTextEditor value={value} format="json" onChange={onChange}>
      <Bold /> <Italic /> <Link />
      <Content />
    </RichTextEditor>
  ) : (
    <RichTextViewer value={value} format="json" />
  );
}
```

### Heading & Checklist

`Heading` offers all six levels (1–6) by default (pass `levels={[1, 2, 3]}`
etc. to narrow it). `Checklist` toggles a task list — items render as a
real Ant Design `Checkbox` in both Editor and Viewer, not a bare
`<input type="checkbox">` (see the "Design notes" section on
`TaskItemNodeView`).

### Link

The `Link` control opens an Ant Design `Modal` (not a popover) with every
field the spec calls for: URL (required), Text (defaults to the URL when
left empty), Target (`_self`/`_blank`/`_parent`/`_top`/none), Rel, Tab
Index, Title, and ARIA Label. It's part of `createCoreExtensions()`
already — no extra wiring needed:

```tsx
import { RichTextEditor, Content, Bold, Italic, Link } from "@rte/react/editor";

<RichTextEditor value={value} onChange={onChange}>
  <Bold /> <Italic /> <Link />
  <Content />
</RichTextEditor>;
```

**Link content can be text or an Image.** If the selection is an
Image/ImageInline node when the modal opens, the Text field is hidden and
the link mark is applied straight to that image — the resulting structure
is `Link → Image`, matching the spec's "Image Inside Link" section, and
its Markdown serialization is decided *jointly* (see below), not by
serializing the image and link independently and gluing the strings
together.

The library does **not** auto-inject `rel="noopener noreferrer"` when
Target is `_blank` — the modal shows a hint suggesting it, but the field
is otherwise exactly what the spec describes: a plain optional attribute
the user fills in. (The base `@tiptap/extension-link` package actually
defaults to auto-injecting `target="_blank"` and a `rel` value on every
link, regardless of what you configure — `src/editor/extensions/link.ts`
overrides `renderHTML` entirely specifically to stop that; see that
file's comment if you're extending it further.)

#### Link + Image Markdown capability (spec: Link Markdown Capability / Serialization Rules)

`src/editor/content/link-markdown.ts` (`describeLinkForMarkdown`) and
`src/nodes/Image/markdown.ts` (`describeImageForMarkdown`) are the two
capability checks; `src/editor/content/markdown.ts`'s `wrapImageLink`
composes them together per the spec's decision tree:

| Case | Output |
|---|---|
| Simple text link | `[text](href)` |
| Text link with `target`/`rel`/`tabIndex`/`ariaLabel` | `<a href="..." target="...">text</a>` |
| Text link with only `title` | `[text](href "title")` — CommonMark supports link titles natively |
| Simple image, simple link | `[![alt](src)](href)` |
| **Advanced image** (e.g. has `width`), simple link | Whole thing becomes HTML: `<a href="..."><img ... width="..."></a>` — **not** `[<img width>](href)`; the spec is explicit that the complete Link+Image structure must move to HTML together, never just the image half |
| Simple image, **advanced link** | Same — the complete structure becomes HTML |



```tsx
import { RichTextEditor, createTableExtensions, TableControl } from "@rte/react/editor";
import { createImageEditorExtensions, ImageControl } from "@rte/react/editor";

<RichTextEditor
  value={value}
  onChange={onChange}
  extensions={[...createTableExtensions(), ...createImageEditorExtensions()]}
>
  <TableControl />
  <ImageControl />
  <Content />
</RichTextEditor>;
```

For `RichTextViewer`, pass the schema-only extensions (no NodeView/antd
controls) plus the matching node renderers:

```tsx
import { RichTextViewer, tableNodeRenderers, imageNodeRenderers } from "@rte/react/viewer";
import { createTableExtensions } from "@rte/react/editor"; // schema is framework-agnostic
import { createImageExtensions } from "@rte/react/editor";

<RichTextViewer
  value={value}
  extensions={[...createTableExtensions(), ...createImageExtensions()]}
  nodeRenderers={{ ...tableNodeRenderers, ...imageNodeRenderers }}
/>;
```

### Adding Media (Video / Audio / Embed)

Video and Audio need no security config — they just render a native
`<video>`/`<audio>` tag for a direct file URL:

```tsx
import {
  RichTextEditor,
  createVideoExtensions,
  createAudioExtensions,
  VideoControl,
  AudioControl,
} from "@rte/react/editor";

<RichTextEditor
  value={value}
  onChange={onChange}
  extensions={[...createVideoExtensions(), ...createAudioExtensions()]}
>
  <VideoControl />
  <AudioControl />
  <Content />
</RichTextEditor>;
```

Embed (YouTube/Vimeo/iframe) validates and rewrites the URL before it ever
reaches an iframe `src` (see "Embed security model" below). If you want to
allow your own "custom" provider (e.g. embedding from your own CDN),
pass the hostnames you trust. Use `createEmbedEditorExtensions()` (not
`createEmbedExtensions()`) in the Editor — it adds a NodeView that renders
the same `<EmbedFrame>` component the Viewer uses, so the embed looks and
sizes identically in both instead of the Editor falling back to a bare,
fixed-size `<iframe>`:

```tsx
import { createEmbedEditorExtensions, EmbedControl } from "@rte/react/editor";

<RichTextEditor
  value={value}
  onChange={onChange}
  extensions={[
    ...createEmbedEditorExtensions({ allowedCustomOrigins: ["cdn.myapp.com"] }),
  ]}
>
  <EmbedControl providers={["youtube", "vimeo", "custom"]} />
  <Content />
</RichTextEditor>;
```

For the Viewer, use the plain schema-only `createEmbedExtensions()`
(parsing doesn't need the NodeView) — Embed's node renderer is a
**factory** (not a plain object) because it needs the same
`allowedCustomOrigins` to re-validate at render time:

```tsx
import {
  RichTextViewer,
  videoNodeRenderers,
  audioNodeRenderers,
  createEmbedNodeRenderers,
} from "@rte/react/viewer";
import { createVideoExtensions, createAudioExtensions, createEmbedExtensions } from "@rte/react/editor";

<RichTextViewer
  value={value}
  extensions={[
    ...createVideoExtensions(),
    ...createAudioExtensions(),
    ...createEmbedExtensions({ allowedCustomOrigins: ["cdn.myapp.com"] }),
  ]}
  nodeRenderers={{
    ...videoNodeRenderers,
    ...audioNodeRenderers,
    ...createEmbedNodeRenderers({ allowedCustomOrigins: ["cdn.myapp.com"] }),
  }}
/>;
```

#### Embed security model (read this before enabling "custom")

`src/nodes/Embed/security.ts` is the single choke point every embed src
passes through, in both the editor and the viewer, and again on every
markdown/HTML re-parse — never trust-on-first-parse:

- `provider: "youtube"` / `"vimeo"` — the pasted URL (watch page, share
  link, whatever) is parsed for a video ID and **rewritten** to
  `youtube-nocookie.com/embed/<id>` or `player.vimeo.com/video/<id>`.
  Anything that isn't `https:` or isn't one of those hosts is rejected.
- `provider: "custom"` — requires `https:` **and** a hostname in the
  `allowedCustomOrigins` list you provide. Nothing is custom-allowed by
  default (empty list) — spec 20.1's "custom embeds must be validated" is
  enforced by making you name exactly which origins you trust, rather than
  the library guessing.
- Every rendered iframe gets `sandbox="allow-scripts allow-same-origin
  allow-presentation allow-popups allow-popups-to-escape-sandbox"`,
  `referrerpolicy="strict-origin-when-cross-origin"`, and `loading="lazy"`
  — hardcoded, not configurable per-embed, so a bad provider config can't
  accidentally loosen it document-wide. `allow-same-origin` is required —
  without it, YouTube's own embed script can't reach `caches`/
  `localStorage` and fails outright (`SecurityError: Failed to read the
  'caches' property...`, then a `ReferenceError` from the provider's own
  script never finishing initialization). Combining `allow-scripts` with
  `allow-same-origin` is a known sandbox-escape pattern *for untrusted
  content*, but the trust boundary here is `resolveEmbed`'s origin
  allowlist, not the sandbox — only a fixed set of known-good provider
  origins (or hostnames you explicitly allowlist for `"custom"`) ever get
  into the iframe's `src` in the first place. See the comment on
  `EMBED_SANDBOX` in `security.ts` for the full reasoning; if a
  `"custom"` provider's page can't be trusted with `allow-same-origin`,
  the fix is to not allowlist its origin, not to loosen the sandbox
  further.
- If validation fails (bad protocol, disallowed host, malformed ID), the
  node renders a visible "Embed blocked" placeholder instead of silently
  dropping the content or rendering an unsafe iframe — see
  `scripts/smoke-test-content.ts` for live examples, including a
  `javascript:` URL being rejected.

### Adding Math

Math is two nodes — `math` (block / display) and `mathInline` — because a
single Tiptap node can't switch between block and inline schema behavior
(same reason Image has two). Editing happens **in place**: click an
equation and a live MathLive `<math-field>` takes over. Insertion uses
`MathControl` (a modal with an Inline/Block toggle).

```tsx
import { RichTextEditor, Content, MathControl, createMathEditorExtensions } from "@rte/react/editor";
import { RichTextViewer, mathNodeRenderers } from "@rte/react/viewer";
import { createMathExtensions } from "@rte/react/editor";
import "mathlive/static.css"; // required — see below

// Create extension arrays once (module scope), not inline in render.
const editorExtensions = createMathEditorExtensions();
const viewerExtensions = createMathExtensions();

// Editor: NodeView-backed (live <math-field>)
<RichTextEditor value={value} onChange={onChange} extensions={editorExtensions}>
  <MathControl />
  <Content />
</RichTextEditor>;

// Viewer: schema-only extensions + static renderer (no interactive widget loaded)
<RichTextViewer value={value} extensions={viewerExtensions} nodeRenderers={mathNodeRenderers} />;
```

**Import `mathlive/static.css` — and only that.** It contains the layout
rules *and* the `@font-face` declarations for all 12 math font families,
and it sets `--ML__static-fonts`, which tells MathLive's live editor not to
fetch fonts at runtime (its default runtime loader resolves a `./fonts/`
directory relative to its own script, which doesn't exist once MathLive is
bundled into your app). `mathlive/fonts.css` declares the same fonts (the
two files reference an identical set of font files) without the layout
rules, so importing it as well is redundant. `convertLatexToMarkup` only
returns spans carrying `ML__*` class names — the layout and fonts that make
them look like math come from this stylesheet, so without it the Viewer's
equations are unstyled markup.

#### Markdown syntax

There is no CommonMark syntax for math, so this uses the custom tier of the
Markdown strategy (spec section 5.2) with the convention most tooling
already understands:

| Node | Markdown |
|---|---|
| inline | `$E=mc^2$` |
| block, single line | `$$\int_0^1 x^2\,dx$$` |
| block, multi-line | `$$` on its own line, the LaTeX (verbatim, indentation preserved), `$$` on its own line |
| LaTeX containing a literal `$` | falls back to `<span data-rte-math-inline data-latex="…">` / `<div data-rte-math …>` for that one unit |

Parsing is done by a small markdown-it plugin in this repo
(`src/editor/content/markdown-it-math.ts`) rather than a third-party one.
Its restrictions, deliberately: a block `$$` must **start its own line**
(`text $$x$$ more` mid-line isn't math), and an inline `$…$` can't have
whitespace directly inside the delimiters — the standard heuristic (also
Pandoc's) that keeps "costs $5 and $10" from being read as an equation.

### Adding CodeBlock

A code block hosts a [CodeMirror 6](https://codemirror.net/) editor in the
Editor and renders static, syntax-highlighted lines in the Viewer — both with
the same header, so they look the same:

- **Language** — an antd `<Select>` (searchable, matches aliases like `csharp`)
  listing every language CodeMirror supports: all 143, plus **Plain text**, the
  default. Persisted on the node.
- **Theme** — an antd `<Select>`: **System** (default, follows the OS live),
  **Light**, **Dark**. Runtime-only: never written to the document.
- **Copy** — copies the code text only (no line numbers, no markup).
- **Line numbers**, and in the Editor the active line is highlighted.

```tsx
import { RichTextEditor, Content, CodeBlockControl, createCodeBlockEditorExtensions } from "@rte/react/editor";
import { RichTextViewer, createCodeBlockNodeRenderers } from "@rte/react/viewer";

// Create once (module scope), not inline in render.
const editorExtensions = createCodeBlockEditorExtensions({ defaultTheme: "system" });
const nodeRenderers = createCodeBlockNodeRenderers({ defaultTheme: "system" });

<RichTextEditor value={value} onChange={onChange} extensions={editorExtensions}>
  <CodeBlockControl />   {/* or type ``` then a space */}
  <Content />
</RichTextEditor>;

<RichTextViewer value={value} nodeRenderers={nodeRenderers} />;
```

No other wiring: `createCodeBlockEditorExtensions()` is named `codeBlock`, the same
as the plain code block `createCoreExtensions()` ships, and **replaces it in
place** (`mergeExtensions`) rather than registering a duplicate. The Viewer
needs no extension — only the renderer.

**Keyboard** (inside a block): `Tab` / `Shift-Tab` indent; `ArrowUp`/`ArrowLeft`
at the start and `ArrowDown`/`ArrowRight` at the end leave the block;
`Mod-Enter` exits to a new paragraph; `Backspace` in an empty block turns it
back into a paragraph; `Mod-Z` / `Mod-Shift-Z` use the editor's single undo
history (not a separate CodeMirror one).

**Languages.** A language is stored as a registry id (`javascript`, `c++`,
`common-lisp`) or whatever alias a document already had — `js`, `py`, VS Code's
`typescriptreact` — and is never silently rewritten; it's resolved at display
time. Unknown names show as themselves and render unhighlighted.

**Markdown** is native CommonMark: `` ```js `` fences, and Plain text is a bare
`` ``` `` fence. The fence automatically gets longer than any backtick run inside
the code, so code containing a ```` ``` ```` line round-trips instead of being cut
short.

**Not included (yet).** The spec also lists word wrap, a persisted tab size,
code folding, indent guides, and in-block search; none are built. Tab size is
fixed at 2.

## Known limitations

- **Extra empty paragraph after HTML-fallback blocks in Markdown.** When a
  `video`/`audio`/`embed` node round-trips through `format="markdown"`
  (JSON → Markdown → JSON), an empty paragraph sometimes appears
  immediately after it. This comes from `markdown-it`'s handling of
  adjacent raw HTML blocks with no blank-line separator between them — the
  node's own attributes are unaffected (verified in the smoke test), it's
  a harmless empty sibling node, not data loss. Worth fixing before
  production use; not blocking further phase work.
- Responsive image breakpoints (`ImageResponsive`) round-trip as data but
  have no CSS/media-query rendering yet.
- **Exported `format="html"` for Math is data, not a picture.** The `math`
  / `mathInline` nodes serialize to marker elements carrying `data-latex`
  (same trade-off as Embed's `data-src`): this library's Viewer or
  `<MathView>` typesets it. Opening the exported HTML in a plain browser
  with no JS shows nothing for the equations. Typesetting lives in exactly
  one place (`shared/MathView.tsx`) on purpose.
- **Math Markdown parsing is intentionally narrow** — see the restrictions
  listed under "Adding Math → Markdown syntax" (block `$$` must start its
  line; no whitespace just inside inline `$` delimiters).
- **The live Math widget is only covered by a targeted test, not a real
  browser.** `npm run test:math-editor` drives the real MathLive
  `<math-field>` through `MathNodeView` and the insert modal under
  happy-dom, but the full Editor (ProseMirror) can't mount there, so
  click-to-focus behavior, the virtual keyboard, and real typing aren't
  exercised. Worth a manual pass in a browser.
- **CodeBlock in the Viewer lazy-loads CodeMirror's language packages.**
  Highlighting needs a real parser, so the Viewer fetches `@codemirror/language-data`
  and the language it needs with `import()` on demand. It never creates an
  `EditorView` (what the spec forbids), and its *static* import graph reaches none
  of CodeMirror (`npm run check:viewer-bundle` enforces this, and lists the lazy
  imports). But those language packages depend on `@codemirror/view`/`state` as
  libraries, so a page that shows a highlighted block does download them — that
  is a looser reading of "must not load the editing engine" than "never". If you
  want a hard guarantee, render the Viewer's blocks without highlighting.
- **CodeBlock size.** In the demo (editor + viewer + MathLive + antd in one
  bundle) the main chunk went from 2,358 KB / 730 KB gzip to 2,686 KB / 837 KB
  gzip: about **+107 KB gzip**, for CodeMirror's core. The 143 language packs
  are separate lazy chunks. A viewer-only route doesn't pay the core cost.
- **CodeBlock isn't verified in a real browser.** The tests run real ProseMirror
  and real CodeMirror under happy-dom, so sync, language/theme/read-only,
  and keyboard escape are genuinely exercised — but not real focus/IME/pointer
  behavior, scrolling, or *visual* parity. The Editor and Viewer gutters share
  one stylesheet and the same measurements by construction, not by pixel
  comparison. Worth a look in a browser, especially the dark theme.
- **Theme is per block, and the dropdown isn't themed.** Each block keeps its
  own runtime theme (a reload resets it to the default). The Selects' popup
  menus render in a portal at the app level, so they use your antd theme, not
  the block's light/dark.
- **The Viewer's table column resizing is session-local, not persisted.**
  Dragging a column border in `RichTextViewer` updates that column's
  width in local component state only — there's no `onChange` for the
  Viewer to write it back into the document (spec section 8: Viewer must
  not carry editing state), so the width resets to whatever the document
  says on remount/re-fetch. If you need resized widths to stick, that has
  to happen in the Editor (where it *is* persisted, as `colwidth` on the
  cell, by ProseMirror's own `columnResizing` plugin).

## Project structure

Matches spec section 12, with Phase 5's Image node following the
shared/editor/viewer split from spec section 13:

```
src/
├── components/RichTextEditor/   Editor shell, Content, Context, controls/
├── components/RichTextViewer/   Viewer shell
├── editor/
│   ├── extensions/              core.ts (Phase 1), table.tsx + table-viewer-resize.tsx (Phase 4)
│   ├── content/                 json.ts, html.ts, markdown.ts, parse.ts, serialize.ts
│   └── types.ts
├── nodes/Image/                 types.ts, extension.ts, markdown.ts,
│                                 shared/ImageFigure.tsx, editor/ImageNodeView.tsx,
│                                 editor/extensions.ts, viewer/ImageView.tsx
├── nodes/Video/                 extension.ts, markdown.ts, shared/, viewer/
├── nodes/Audio/                 extension.ts, markdown.ts, shared/, viewer/
├── nodes/Embed/                 extension.ts, security.ts, markdown.ts, shared/, viewer/, editor/
├── nodes/Math/                  extension.ts, markdown.ts, shared/MathView.tsx, viewer/, editor/
├── nodes/CodeBlock/             extension.ts, languages(.generated).ts, markdown.ts, shared/ (header, highlight, theme, clipboard), viewer/, editor/CodeBlockView.ts
├── viewer/renderer/             nodes.tsx, marks.tsx — the node/mark registry
│                                 RichTextViewer walks the canonical JSON with
├── styles/                      content.css (shared), editor.css, viewer.css
├── editor-entry.ts               "@rte/react/editor"
├── viewer-entry.ts               "@rte/react/viewer"
└── index.ts                      "@rte/react" (root)
```

## Design notes worth knowing before extending this

- **CodeBlock is a plain ProseMirror NodeView, with only the header in React.**
  Tiptap's `ReactNodeViewRenderer` gives non-leaf nodes a detached content
  element and has no `setSelection` hook — and a nested editor needs one so
  that arrowing into the block from outside focuses CodeMirror. So
  `CodeBlockView` owns the CodeMirror `EditorView` synchronously and the header
  goes through Tiptap's `ReactRenderer`, which portals into the app's React
  tree (antd's `ConfigProvider` still applies). The sync rules that matter:
  one long-lived `EditorView` (never rebuilt on a transaction — that's what
  loses the cursor); `updating` stops our own dispatches echoing back (remove
  it and a single edit becomes an infinite loop: the test caught 302
  transactions and a stack overflow); and CodeMirror→ProseMirror forwarding
  only happens while CodeMirror has focus, otherwise reconfiguring an
  unfocused block would drag ProseMirror's selection into it.
- **Consumer extensions replace core ones by name.** `mergeExtensions`
  (`editor/extensions/merge.ts`) swaps a same-named extension in place instead
  of appending it. Tiptap tolerates duplicates but logs "Duplicate extension
  names found" and leaves order to chance; the demo-render test fails if
  that warning appears.
- **The language list is generated, not imported.** `@codemirror/language-data`
  statically imports `@codemirror/language` (and so `view`/`state`), so the
  schema, Viewer and `<Select>` read a small committed registry
  (`languages.generated.ts`) instead, and parsers load via `import()`.
  `npm run test:codeblock` regenerates it in memory and fails if it drifted,
  and loads *every* language in the Select to prove each one has a real parser.
  The id rule (`languages.ts` ↔ the generator) is duplicated on purpose; that
  same test catches them disagreeing. Exact-match resolution only — CodeMirror's
  own `matchLanguageName` has a fuzzy mode that maps unrelated strings onto languages.
- **One palette colors both sides.** The Editor's CodeMirror and the Viewer both
  emit CodeMirror's stock `tok-*` classes (`classHighlighter`) and read colors from
  CSS variables on `.rte-codeblock--light` / `--dark` (`content.css`). Switching
  theme is a class change, not a CodeMirror reconfigure, and the two can't drift.
- **Three more zeed-dom/markdown-it traps, all found by round-trip tests.**
  (1) Tiptap's code block reads its language from `element.firstElementChild`
  and `classList`; zeed-dom (what `generateJSON` parses html/markdown with)
  implements neither, so every parsed block silently fell back to the default
  language. It works in a browser, which is why it hides. The extension now uses
  `childNodes` + `getAttribute`. (2) markdown-it renders every fenced block with a
  trailing `\n`, which became part of the text — each markdown round trip grew
  the code by one blank line. (3) The old serializer always wrote a 3-backtick
  fence, truncating any block containing a ```` ``` ```` line.
- **Test-harness lessons (CodeBlock).** `react-dom` feature-detects the `input`
  event *once, at import time*: imported before the happy-dom globals exist it
  permanently picks a legacy path, and simulated typing silently does nothing —
  for every input, even a stock antd `Select`. Load it after the DOM is set up.
  A `matchMedia` stub must track listeners per query, or a fake "OS went dark"
  event reaches CodeMirror's own `print` listener and crashes it. And two of my
  first assertions were hollow until mutation-tested: "rapid switching, last
  language wins" passed *without* the stale-load guard (everything was cached,
  so loads resolved in order) — it now uses a small static seam
  (`CodeBlockView.loadLanguage`) to make the first load slower than the second;
  and my first filter assertions passed against an unfiltered list because
  happy-dom doesn't virtualize the dropdown. Every guard in
  `smoke-test-codeblock*.ts` has been broken on purpose and confirmed to fail.

- **`import "mathlive"` is not the same module in Node and in a browser.**
  MathLive's package uses export conditions: under Node it resolves to
  `mathlive-ssr.min.mjs`, a DOM-free stub that registers *no* custom
  element; in a bundler targeting browsers it resolves to the real widget.
  Two consequences. (1) A test that just imports `"mathlive"` silently
  tests a plain `HTMLElement` and passes — `scripts/smoke-test-math-editor.ts`
  loads `node_modules/mathlive/mathlive.mjs` **by file path** and asserts
  the element registered and that the mounted node is a real
  `MathfieldElement`. (2) The Viewer deliberately imports only
  `mathlive/ssr` (via `shared/MathView.tsx`), which is also what keeps the
  interactive widget out of view-only bundles.
- **The Viewer/Editor split is now enforced against the build output, not
  just by convention.** `scripts/check-viewer-bundle.mjs` walks the import
  graph from `dist/viewer.js` and fails if anything reachable imports
  `@tiptap/react`, ProseMirror's state/view, the interactive `mathlive`
  entry, or `@ant-design/icons`. Verified by making the realistic mistake
  (changing `mathlive/ssr` to `mathlive` in `MathView.tsx`): the check
  failed with the full import chain. Run it (or `npm test`) after touching
  anything in `shared/` or the entry files.
- **MathLive's typings and its docs disagree.** `convertLatexToMarkup`'s
  doc comment says `defaultMode` is `"displaystyle" | "textstyle"`; the
  shipped `.d.ts` says `'math' | 'inline-math' | 'text'` (the same enum
  `MathfieldElement` uses). The `.d.ts` is right — `MathView` uses
  `"math"` for block and `"inline-math"` for inline.
- **Tests wait on conditions, not clocks.** `smoke-test-demo-render.ts`
  once failed a single run (every "content is present" assertion false,
  the one "content is absent" assertion true — i.e. empty output) that I
  could not reproduce afterwards — not against the original (0 of 12 runs
  under heavy single-core contention), and not after the change below (0 of
  39 further runs, 24 of them contended). The cause was never identified, so
  "0 of 39" shows the harness is stable now, not that the original failure
  is explained. What was
  fixed is what's known to be weak: it slept a fixed 100–300ms and hoped
  React had flushed; it now polls until the output exists, and on failure
  prints the HTML length and its first 600 characters so a recurrence is
  diagnosable instead of mysterious. If it recurs, that output is the
  starting point.

- **Every control that renders a `<Button>` (or `<Select>`, for `Heading`)
  uses `React.forwardRef`.** Not optional polish — `Tooltip`/`Popover`
  need a real ref to their child to position themselves and observe its
  size, and a plain function component can't provide one. Without a ref,
  antd falls back to the deprecated `ReactDOM.findDOMNode`, which logs a
  loud warning under `React.StrictMode` (exactly the one in the demo's
  console, from `<Tooltip><Checklist /></Tooltip>` et al. before this was
  fixed) and will stop working in a future React major version entirely
  — this isn't just a noisy warning, it's a ticking deprecation. Any new
  control added to this library needs the same treatment:
  `forwardRef<HTMLButtonElement, XProps>((props, ref) => <Button ref={ref}
  ... />)`, plus `X.displayName = "X"` (an anonymous `forwardRef` shows up
  as `Anonymous` in React DevTools otherwise).
  `scripts/smoke-test-demo-render.ts` now renders the demo inside
  `React.StrictMode` (matching `example/main.tsx`) with `console.error`
  intercepted specifically for `findDOMNode` — it fails the script, not
  just prints, if this regresses. Verified by deliberately reverting one
  control's `forwardRef` and confirming the script caught it before
  restoring the fix.

- **A `style` returned from `renderHTML` silently vanishes from exported
  HTML — but only through `generateHTML`, not in the live editor.**
  ProseMirror's `DOMSerializer` special-cases the attribute name `"style"`
  and applies it via `dom.style.cssText = value` instead of
  `setAttribute`. `generateHTML` (used by `jsonToHtml`, and therefore by
  every `format="html"`/`format="markdown"` export) serializes into
  `zeed-dom` — a lightweight, browser-free DOM — whose `style` object
  silently ignores `cssText` assignment. So a real browser shows the
  style fine (that's why this went unnoticed at first), but exported HTML
  doesn't have it at all. Bit both `ImageInline`'s `vertical-align` and
  the Embed wrapper's `aspect-ratio` this way. The fix,
  `src/editor/content/style-attr.ts`'s `styleAttrs()`, emits the
  attribute as `STYLE` (uppercase) instead of `style` — HTML attribute
  names are case-insensitive, so browsers and HTML parsers (zeed-dom
  included, verified on re-parse) treat it identically, but the literal
  string `"style"` never appears for `DOMSerializer` to special-case. Any
  new node/mark that needs an inline style in its `renderHTML` should use
  this helper instead of a plain `style:` key, and ideally get a
  regression assertion like the ones in `scripts/smoke-test-content.ts`
  (which are written to actually throw, not just print, specifically so
  this class of "works live, silently breaks on export" bug can't
  reappear unnoticed).
- **`justifyContent` vs `alignItems` in a `flex-direction: column`
  container** — easy to get backwards, and `nodes/Image/shared/
  ImageFigure.tsx` did for a while. `justifyContent` aligns along the
  *main* axis; in a column flex container the main axis is vertical, so
  `justifyContent: center` centers top-to-bottom and does nothing for the
  left/right `align` this component actually needs. `alignItems` is the
  *cross* axis (horizontal, here) — that's the one `align` should map to.
- **Editor/Viewer visual parity for Embed now comes from literally
  sharing a component**, not matching CSS by hand. `nodes/Embed/editor/
  EmbedNodeView.tsx` renders the same `<EmbedFrame>` the Viewer uses,
  the same way Image's `editor/ImageNodeView.tsx` does — see
  `createEmbedEditorExtensions()` vs the schema-only `createEmbedExtensions()`
  (the split exists so the Viewer bundle doesn't pull in `@tiptap/react`,
  same reasoning as Image's split). Before this, the Editor rendered
  Embed through the node's own bare `renderHTML` — a fixed-pixel,
  unwrapped `<iframe>` with none of `EmbedFrame`'s responsive aspect-ratio
  box — which is why it looked different from (and not full-width like)
  the Viewer.

- **Viewer mark keys must be prefixed by the outer node's own key, not
  just `mark-${type}-${index}`.** `renderMarks` (viewer/renderer/marks.tsx)
  assigns each wrapped mark a React key from its position *within that one
  node's own marks array* — which restarts at 0 for every text/inline node.
  Two sibling links in the same paragraph (e.g. `[a](...)  [b](...)`) each
  have exactly one mark at index 0, so both produced literally the same
  key (`mark-link-0`) and React warned about duplicate keys (and, per
  React's own docs, that's "unsupported" territory — content can actually
  get dropped or duplicated on re-render, not just a lint-style warning).
  Fixed by threading the caller's own per-node key
  (`renderInline`/`renderChildren`'s `${node.type}-${index}`) into
  `renderMarks` as a required prefix. Any future code that calls
  `renderMarks` directly needs to pass a key that's already unique among
  its siblings — the function can't invent that on its own since it only
  sees one node's marks in isolation.
- **A ProseMirror plugin can add real interactivity to the DOM with zero
  CSS, and that's easy to mistake for "not implemented."** Enabling
  `@tiptap/extension-table`'s `resizable: true` does add the
  `columnResizing` plugin and its mousedown/drag logic — that part
  actually worked the whole time. What was missing is that the plugin's
  resize-handle element is a bare `<div class="column-resize-handle">`
  with **no inline styles at all**; without CSS for that class (and
  `position: relative` on the cell it's positioned against, and a
  `.resize-cursor` rule for the drag cursor), the handle has zero
  effective size and is both invisible and nearly impossible to grab. All
  three are now in `editor.css`. Worth remembering for any other
  ProseMirror-plugin-provided feature: check what DOM it produces before
  assuming a missing visual effect means the feature itself is broken.

- **Checklists render a real Ant Design `Checkbox` in both Editor and
  Viewer**, not a bare `<input type="checkbox">`. The Editor gets it via
  an editor-only NodeView (`editor/extensions/task-item.ts` +
  `components/RichTextEditor/nodeviews/TaskItemNodeView.tsx`); the Viewer
  gets it directly in `viewer/renderer/nodes.tsx`'s `taskItem` renderer
  (`disabled`, non-interactive). This is wired in **automatically** —
  unlike Table/Image/etc., a styled checklist isn't opt-in, it's baseline
  behavior the same way Bold/Italic are, so `<RichTextEditor>` composes it
  without the consumer passing any extra `extensions`.
  `createCoreExtensions()` takes an internal `taskItem` override
  parameter for this rather than registering a second same-named
  extension alongside the schema-only one — two extensions sharing a name
  works in Tiptap (last one wins) but logs a "Duplicate extension names
  found" console warning; the override parameter avoids that entirely.
- **Table styling parity between Editor and Viewer doesn't come from the
  `rte-table` class** the way you'd expect. `@tiptap/extension-table`'s
  default `resizable: true` swaps in its own `TableView` NodeView for
  column-drag-resize, and that NodeView builds the `<table>` with plain
  `document.createElement` — it completely ignores `HTMLAttributes`, so
  the `class: "rte-table"` passed to `Table.configure()` never reaches the
  live editor's `<table>` at all (it only actually applies to *static*
  HTML generation — `jsonToHtml`/`generateHTML` — since that path uses
  the node's `renderHTML` instead). What that NodeView *does* always do is
  wrap the table in `<div class="tableWrapper">`, so `tableNodeRenderers`
  in `editor/extensions/table.tsx` wraps the Viewer's `<table>` in the
  same `div.tableWrapper`, and `content.css` targets `.tableWrapper table`
  as the real shared selector (`table.rte-table` is kept too, as a
  fallback for the `resizable: false` / pure-HTML-generation path where
  the class does apply). If you add another table-like extension with its
  own resizing/NodeView behavior, check whether it bypasses
  `HTMLAttributes` the same way before assuming a `.configure({
  HTMLAttributes })` class will actually reach the DOM.
- **RULE 1 enforcement**: `parseContent`/`serializeContent`
  (`src/editor/content/parse.ts` / `serialize.ts`) are the *only* place
  format conversion happens. Don't call `generateHTML`/markdown functions
  directly from components — go through these two functions so JSON stays
  the single source of truth.
- **RULE 23** (block vs inline image needing separate node types) is why
  there are two node types, `image` and `imageInline`, in
  `src/nodes/Image/extension.ts`, not one node with a `displayMode: "inline"`
  value.
- **Attribute auto-render gotcha**: Tiptap auto-serializes every
  `addAttributes()` entry onto the rendered HTML tag unless you set
  `renderHTML: () => ({})` on that attribute. The Image extension hit this
  (attrs were leaking onto `<figure>`) — see the comment in
  `src/nodes/Image/extension.ts`. Any new node extension should set this
  explicitly for attributes it renders manually.
- **Attribute auto-parse mirrors this**: by default each attribute is also
  *parsed* from `element.getAttribute(name)` on whatever DOM element the
  node's own `parseHTML()` rule matched. When a rule matches a wrapper
  element (e.g. `<figure>`) rather than the element that actually carries
  the data (`<img>` inside it), that default extraction reads the wrong
  element and silently returns `null`/defaults. This project disables it
  (`parseHTML: () => null`) on Image's attributes and extracts everything
  explicitly inside each tag rule's `getAttrs` instead — do the same for
  any node whose meaningful children live inside a wrapper tag.
- **Markdown fallback HTML must match the parser's own tag rules.** The
  hand-written Markdown serializer for tables/images (`table-markdown.ts`,
  `nodes/Image/markdown.ts`) emits raw HTML independently of Tiptap's own
  `renderHTML`. If that hand-written HTML doesn't carry the same marker
  attributes the node's `parseHTML()` rule looks for (e.g. `data-rte-image`),
  round-tripping through Markdown silently degrades to unstructured HTML
  parsing. This bit us once during development (caption was dropped) —
  the smoke test in `scripts/smoke-test-content.ts` exists specifically to
  catch this class of regression before it ships.
- **Viewer/editor bundle separation** relies on not importing `@tiptap/react`
  or Ant Design editing controls from anything the viewer might import.
  `nodes/Image/extension.ts` (schema only) is safe for both; the NodeView
  lives in `nodes/Image/editor/extensions.ts` specifically so viewer-only
  consumers never pull it in.
- **Block vs. inline image is genuinely ambiguous from HTML/Markdown
  alone, and marks make it worse.** `image` (block) and `imageInline` both
  parse from a bare `<img>` tag, and Markdown has no syntax to distinguish
  them at all — `![alt](src)` is used for both, and even our own HTML
  fallback always ends up wrapped in a `<p>` once it round-trips through
  `markdown-it` (CommonMark always paragraph-wraps images). The only
  signal left is *context*: is the `<img>` the sole content of its
  paragraph (→ block), or does it share that paragraph with other text or
  images (→ inline, and very possibly wrapped in a Link mark's `<a>`)?
  `src/nodes/Image/extension.ts`'s `isSoleBlockContent` walks up past
  mark-wrapper tags (`<a>`, `<strong>`, ...) to find the real containing
  block and checks this — **but only when that container is literally a
  `<p>`**. The first version of this check didn't have that restriction
  and broke standalone block images, because Tiptap's own `generateHTML`
  output doesn't wrap block nodes in `<p>` at all — a top-level `<img>`
  sitting among many sibling `<h1>`/`<table>`/`<video>` elements has a
  "container" with many children too, but for a completely different
  reason (it's a whole document, not mixed inline content) — get this
  distinction wrong and it looks fine until you round-trip through
  Markdown specifically. Also worth knowing: **`@tiptap/html`'s
  `generateJSON` parses using `zeed-dom`, not a real browser DOM or
  jsdom** — it implements `.parentNode` and `.childNodes` but *not*
  `.parentElement` or `.contains()`. Any `getAttrs` function that walks
  the DOM (as this one does) has to stick to the lowest-common-denominator
  API that works in both a real browser and zeed-dom, or it'll silently
  misbehave only in the html/markdown parsing path while looking correct
  in the live editor. `scripts/smoke-test-content.ts`'s image-link
  fixtures exist specifically to catch this category of bug — they did,
  twice, while building this.

## Extending to the remaining phases

Follow the Table pattern (`src/editor/extensions/table.tsx` +
`src/editor/content/table-markdown.ts`) or the Image pattern
(`src/nodes/Image/`) for each remaining feature:

1. Add the Tiptap extension(s) (official Tiptap package where the spec says
   to use one — CharacterCount, InvisibleCharacters, FontFamily, FontSize,
   LineHeight, Find & Replace, TableOfContents are all supposed to be the
   official extensions per RULE 30–33).
2. Add pure (non-JSX) markdown/HTML serialization if the node needs
   capability-aware fallback.
3. Add viewer node/mark renderers to `viewer/renderer/nodes.tsx` or a
   sibling registry, imported via `mergeNodeRenderers`/`mergeMarkRenderers`.
4. Add an editor control under `controls/` if the feature needs one users
   interact with directly.
5. Extend `editor-entry.ts`/`viewer-entry.ts`/`index.ts` exports.
6. Extend `scripts/smoke-test-content.ts` with a fixture covering the new
   node so round-trip regressions are caught immediately, the way it caught
   the image-caption bug above.

CodeBlock (Phase 9) is the one exception to "just add a Tiptap extension":
it requires wiring CodeMirror 6 as a custom NodeView (spec section 24) and
a *separate*, lightweight `<pre><code>` viewer renderer (RULE 21) — budget
real time for it; it's the most involved remaining piece.
