// import * as React from "react";
import { useState } from "react";
import { Space, Divider, Segmented, Tooltip } from "antd";
import {
  RichTextEditor,
  Content,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  BulletList,
  OrderedList,
  Checklist,
  CodeBlockControl,
  Link,
  Undo,
  Redo,
  TableControl,
  TableToolbar,
  ImageControl,
  VideoControl,
  AudioControl,
  EmbedControl,
  MathControl,
  createTableExtensions,
  createImageEditorExtensions,
  createImageExtensions,
  createVideoExtensions,
  createAudioExtensions,
  createEmbedExtensions,
  createEmbedEditorExtensions,
  createMathExtensions,
  createMathEditorExtensions,
  createCodeBlockEditorExtensions,
  createCodeBlockNodeRenderers,
  tableNodeRenderers,
  imageNodeRenderers,
  videoNodeRenderers,
  audioNodeRenderers,
  createEmbedNodeRenderers,
  mathNodeRenderers,
  type ContentFormat,
  type JSONContent,
} from "./editor-entry";
import { RichTextViewer } from "./viewer-entry";

// -----------------------------------------------------------------------
// Extensions. Table/Image/Video/Audio/Embed are each additive (spec
// section 9/12) — Phase 1 (createCoreExtensions) is baked into
// RichTextEditor/RichTextViewer automatically; everything below is
// composed on top via the `extensions` prop.
//
// Any "custom" provider embeds are allowlisted here in ONE place — see
// README.md's "Embed security model" section before changing this.
// -----------------------------------------------------------------------
const ALLOWED_CUSTOM_EMBED_ORIGINS = ["cdn.example.com"];

const editorExtensions = [
  ...createTableExtensions(),
  ...createImageEditorExtensions(), // NodeView + antd editing UI
  ...createVideoExtensions(),
  ...createAudioExtensions(),
  ...createEmbedEditorExtensions({ allowedCustomOrigins: ALLOWED_CUSTOM_EMBED_ORIGINS }), // NodeView: same EmbedFrame as the Viewer
  ...createMathEditorExtensions(), // NodeView: live MathLive <math-field>
  ...createCodeBlockEditorExtensions(), // NodeView: CodeMirror 6 (replaces the plain core codeBlock by name)
];

// Viewer gets the schema-only Image extensions (no NodeView / antd
// controls pulled in) — see README's "Adding Table / Image" section.
const viewerExtensions = [
  ...createTableExtensions(),
  ...createImageExtensions(),
  ...createVideoExtensions(),
  ...createAudioExtensions(),
  ...createEmbedExtensions({ allowedCustomOrigins: ALLOWED_CUSTOM_EMBED_ORIGINS }),
  ...createMathExtensions(),
];

const viewerNodeRenderers = {
  ...tableNodeRenderers,
  ...imageNodeRenderers,
  ...videoNodeRenderers,
  ...audioNodeRenderers,
  ...createEmbedNodeRenderers({ allowedCustomOrigins: ALLOWED_CUSTOM_EMBED_ORIGINS }),
  ...mathNodeRenderers,
  ...createCodeBlockNodeRenderers(),
};

// -----------------------------------------------------------------------
// Sample content touching every currently implemented node/mark so the
// demo shows Phase 1–6 all at once.
// -----------------------------------------------------------------------
const initialJson: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Tiptap + Ant Design RTE — full feature demo" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Phases 1–3 (marks, lists, links) plus 4–6 (table, image, video, audio, embed) are all wired up below. Try " },
        { type: "text", text: "editing", marks: [{ type: "bold" }] },
        { type: "text", text: ", " },
        { type: "text", text: "formatting", marks: [{ type: "italic" }] },
        { type: "text", text: ", inserting media, or flipping to the read-only viewer with the toggle above." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Heading 2" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "Heading 3" }],
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [{ type: "text", text: "Heading 4" }],
    },
    {
      type: "heading",
      attrs: { level: 5 },
      content: [{ type: "text", text: "Heading 5" }],
    },
    {
      type: "heading",
      attrs: { level: 6 },
      content: [{ type: "text", text: "Heading 6" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Core marks, lists, links (Phase 1)" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "JSON / HTML / Markdown formats (Phase 2)" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Diagrams (Phase 8) — not yet built" }] }],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Links now open a modal (URL, Text, Target, Rel, Tab Index, Title, ARIA Label) — try " },
        {
          type: "text",
          text: "this simple link",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
        { type: "text", text: " or " },
        {
          type: "text",
          text: "this one that opens in a new tab",
          marks: [{ type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer" } }],
        },
        { type: "text", text: ". An image can be a link too: " },
        {
          type: "imageInline",
          attrs: { src: "https://picsum.photos/id/237/64/64", alt: "Linked thumbnail" },
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Math (Phase 7): Einstein's " },
        { type: "mathInline", attrs: { latex: "E=mc^2" } },
        { type: "text", text: " inline, and a block equation below — click either to edit with MathLive." },
      ],
    },
    {
      type: "math",
      attrs: { latex: "\\int_0^1 x^2\\,dx = \\frac{1}{3}", display: true },
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Code blocks (Phase 9) use CodeMirror 6 — pick a language and theme from the header, copy the code, or just type three backticks. Try Tab to indent and ArrowDown at the last line to leave the block." },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "jsx" },
      content: [{ type: "text", text: "import { Crepe } from '@milkdown/crepe'\nimport '@milkdown/crepe/theme/common/style.css'\n// We have some themes for you to choose, ex.\nimport '@milkdown/crepe/theme/frame.css'\n\n// Or you can create your own theme\nimport './your-theme.css'\n\nconst crepe = new Crepe({\n  root: '#app',\n  defaultValue: '# Hello, Milkdown!',\n})\n\ncrepe.create().then(() => {\n  console.log('Milkdown is ready!')\n})\n\n// Before unmount\ncrepe.destroy()" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "python" },
      content: [{ type: "text", text: "def greet(name: str) -> str:\n    return f\"Hello, {name}!\"\n\nprint(greet(\"world\"))" }],
    },
    {
      type: "codeBlock",
      attrs: { language: "plaintext" },
      content: [{ type: "text", text: "No language selected \u2014 this block is plain text.\nLine two." }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Phase" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Feature" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Status" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "4" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Table" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "5" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Image" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }] },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        src: "https://picsum.photos/id/1015/640/360",
        alt: "Mountain river",
        caption: "Block image with a caption (Phase 5)",
        align: "center",
        displayMode: "block",
        width: 480,
      },
    },
    {
      type: "embed",
      attrs: {
        src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        provider: "youtube",
        width: 480,
        height: 270,
        title: "Sample embed (Phase 6)",
      },
    },
  ],
};

export default function App() {
  const [format, setFormat] = useState<ContentFormat>("json");
  const [value, setValue] = useState<string | JSONContent>(initialJson);
  const [mode, setMode] = useState<"edit" | "view">("edit");

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "edit" | "view")}
          options={[
            { label: "Editor (canEditContent = true)", value: "edit" },
            { label: "Viewer (canEditContent = false)", value: "view" },
          ]}
        />

        {mode === "edit" ? (
          <RichTextEditor
            value={value}
            format={format}
            onChange={setValue}
            extensions={editorExtensions}
            placeholder="Start typing..."
          >
            <Toolbar />
            <TableToolbar />
            <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 12 }}>
              <Content />
            </div>
          </RichTextEditor>
        ) : (
          <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 12 }}>
            <RichTextViewer
              value={value}
              format={format}
              extensions={viewerExtensions}
              nodeRenderers={viewerNodeRenderers}
            />
          </div>
        )}

        <Divider />
        <div>
          <strong>Current format:</strong> {format}
          <Space style={{ marginLeft: 12 }}>
            {(["json", "html", "markdown"] as ContentFormat[]).map((f) => (
              <a key={f} onClick={() => setFormat(f)}>
                {f}
              </a>
            ))}
          </Space>
          <span style={{ marginLeft: 12, color: "rgba(0,0,0,0.45)" }}>
            (switching format converts the current document — round-trip fidelity is what Phase 2 guarantees)
          </span>
        </div>
        <pre style={{ background: "#fafafa", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 400 }}>
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
      </Space>
    </div>
  );
}

/**
 * The library deliberately does not ship a Toolbar component (RULE 4/5/6)
 * — this is what a consumer-owned toolbar looks like, grouping controls
 * with Ant Design Space + Divider however the app wants.
 */
function Toolbar() {
  return (
    <Space 
      wrap 
      size={[4, 4]}
      style={{ 
        // marginBottom: 8, 
        padding: 6,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: '#fff',
        width: '100%',
        // borderBottom: '1px solid #ccc',
      }} 
    >
      <Heading />
      {/* <Divider orientation="vertical" /> */}
      <Space.Compact>
        <Bold />
        <Italic />
        <Underline />
        <Strikethrough />
      </Space.Compact>
      {/* <Divider orientation="vertical" /> */}
      <Space.Compact>
        <BulletList />
        <OrderedList />
        <Tooltip title="Checklist">
          <Checklist />
        </Tooltip>
        <Tooltip title="Code block (CodeMirror)">
          <CodeBlockControl />
        </Tooltip>
      </Space.Compact>
      {/* <Divider orientation="vertical" /> */}
      <Link />
      {/* <Divider orientation="vertical" /> */}
      <TableControl />
      <Tooltip title="Insert image (Phase 5)">
        <ImageControl />
      </Tooltip>
      <Tooltip title="Insert video (Phase 6)">
        <VideoControl />
      </Tooltip>
      <Tooltip title="Insert audio (Phase 6)">
        <AudioControl />
      </Tooltip>
      <Tooltip title="Embed YouTube / Vimeo / custom (Phase 6)">
        <EmbedControl providers={["youtube", "vimeo", "custom"]} />
      </Tooltip>
      <Tooltip title="Insert math (Phase 7)">
        <MathControl />
      </Tooltip>
      {/* <Divider orientation="vertical" /> */}
      <Space.Compact>
        <Undo />
        <Redo />
      </Space.Compact>
    </Space>
  );
}
