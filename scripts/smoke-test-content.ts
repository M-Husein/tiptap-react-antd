import { createCoreExtensions } from "../src/editor/extensions/core";
import { createTableExtensions } from "../src/editor/extensions/table";
import { createImageExtensions } from "../src/nodes/Image/extension";
import { createVideoExtensions } from "../src/nodes/Video/extension";
import { createAudioExtensions } from "../src/nodes/Audio/extension";
import { createEmbedExtensions } from "../src/nodes/Embed/extension";
import { createMathExtensions } from "../src/nodes/Math/extension";
import { resolveEmbed } from "../src/nodes/Embed/security";
import { parseContent } from "../src/editor/content/parse";
import { serializeContent } from "../src/editor/content/serialize";

const extensions = [
  ...createCoreExtensions(),
  ...createTableExtensions(),
  ...createImageExtensions(),
  ...createVideoExtensions(),
  ...createAudioExtensions(),
  ...createEmbedExtensions({ allowedCustomOrigins: ["cdn.example.com"] }),
  ...createMathExtensions(),
];

console.log("=== Embed security validation ===");
console.log("valid youtube watch url ->", resolveEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"));
console.log("valid youtu.be url       ->", resolveEmbed("https://youtu.be/dQw4w9WgXcQ", "youtube"));
console.log("malicious javascript: url ->", resolveEmbed("javascript:alert(1)", "youtube"));
console.log("wrong host for youtube    ->", resolveEmbed("https://evil.com/embed/xyz", "youtube"));
console.log("custom not allowlisted    ->", resolveEmbed("https://not-allowed.com/x", "custom"));
console.log("custom allowlisted        ->", resolveEmbed("https://cdn.example.com/x", "custom", { allowedCustomOrigins: ["cdn.example.com"] }));
console.log();

const json = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hello world" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " and " },
        { type: "text", text: "a link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item one" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item two" }] }] },
      ],
    },
    {
      type: "image",
      attrs: { src: "https://example.com/cat.png", alt: "A cat", align: "center", displayMode: "block" },
    },
    {
      type: "image",
      attrs: {
        src: "https://example.com/dog.png",
        alt: "A dog",
        caption: "A very good dog",
        align: "center",
        displayMode: "block",
        width: 400,
      },
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Role" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Ada" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Engineer" }] }] },
          ],
        },
      ],
    },
    {
      type: "video",
      attrs: { src: "https://example.com/clip.mp4", poster: "https://example.com/poster.jpg", width: 640, height: 360 },
    },
    { type: "audio", attrs: { src: "https://example.com/track.mp3", title: "Track" } },
    {
      type: "embed",
      attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", provider: "youtube", width: 560, height: 315, title: "Demo video" },
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Simple link: " },
        { type: "text", text: "Example", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
        { type: "text", text: ". Advanced link: " },
        {
          type: "text",
          text: "Open in new tab",
          marks: [{ type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer" } }],
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "imageInline",
          attrs: { src: "/images/example.png", alt: "Example" },
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
        { type: "text", text: " simple image link, then an advanced one: " },
        {
          type: "imageInline",
          attrs: { src: "/images/example.png", alt: "Example", width: 640 },
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
  ],
};

console.log("=== JSON -> HTML ===");
const html = serializeContent(json as any, "html", extensions);
console.log(html);

console.log("\n=== JSON -> Markdown ===");
const markdown = serializeContent(json as any, "markdown", extensions);
console.log(markdown);

console.log("=== Markdown -> JSON (round trip) ===");
const roundTripped = parseContent(markdown, "markdown", extensions);
console.log(JSON.stringify(roundTripped, null, 2));

console.log("\n=== HTML -> JSON (round trip) ===");
const fromHtml = parseContent(html, "html", extensions);
console.log(JSON.stringify(fromHtml, null, 2));

// ---------------------------------------------------------------------------
// Regression assertions — these THROW (non-zero exit) instead of printing,
// so a regression fails `npm run test:content` rather than needing someone
// to eyeball the dumps above. Each one guards a bug that already happened.
// ---------------------------------------------------------------------------
{
  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  };

  const doc: any = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "a " },
          { type: "imageInline", attrs: { src: "/x.png", alt: "x", width: 65, verticalAlign: "middle" } },
          { type: "text", text: " b" },
        ],
      },
      {
        type: "embed",
        attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", provider: "youtube", width: 480, height: 270, title: "S" },
      },
      { type: "heading", attrs: { level: 5 }, content: [{ type: "text", text: "h5" }] },
      { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "h6" }] },
    ],
  };

  for (const fmt of ["html", "markdown"] as const) {
    const out = serializeContent(doc, fmt, extensions) as string;
    const back: any = parseContent(out, fmt, extensions);
    const inline = back.content[0].content[1].attrs;
    const embed = back.content.find((n: any) => n.type === "embed")?.attrs;
    const levels = back.content.filter((n: any) => n.type === "heading").map((n: any) => n.attrs.level);

    assert(inline.verticalAlign === "middle", `[${fmt}] inline image verticalAlign lost (got ${inline.verticalAlign})`);
    assert(embed?.src === doc.content[1].attrs.src, `[${fmt}] embed src did not round-trip`);
    assert(embed?.width === 480 && embed?.height === 270, `[${fmt}] embed width/height did not round-trip`);
    assert(levels.join() === "5,6", `[${fmt}] heading levels 5/6 did not round-trip (got ${levels})`);
    assert(!out.includes("data-embed-src"), `[${fmt}] stale data-embed-src attribute in output`);
    assert(out.includes('data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"'), `[${fmt}] embed missing data-src`);
    assert(/aspect-ratio:480\/270/.test(out), `[${fmt}] embed lost its responsive aspect-ratio style`);
  }
  console.log("\n✔ regression assertions passed (verticalAlign, embed data-src/aspect-ratio, headings 5-6)");
}

// ---------------------------------------------------------------------------
// Math regression assertions. Each case guards a bug that actually happened
// while building this: multi-line latex falling out of the block syntax,
// markdown-it stripping indentation, and `$` inside latex breaking the
// custom syntax.
// ---------------------------------------------------------------------------
{
  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  };
  const multiline = "\\begin{aligned}\n  x &= 1 \\\\\n  y &= 2\n\\end{aligned}"; // note: 2-space indent must survive
  const cases: Array<[string, string, "math" | "mathInline"]> = [
    ["simple block", "a^2 + b^2 = c^2", "math"],
    ["backslashes", "\\int_0^1 x^2\\,dx = \\frac{1}{3}", "math"],
    ["multi-line + indentation", multiline, "math"],
    ["literal $ (forces HTML-marker fallback)", "\\text{cost } \\$5", "math"],
    ["inline simple", "E=mc^2", "mathInline"],
    ["inline literal $", "\\$x", "mathInline"],
  ];

  for (const fmt of ["markdown", "html"] as const) {
    for (const [name, latex, type] of cases) {
      const doc: any = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "before" }] },
          type === "math"
            ? { type: "math", attrs: { latex, display: true } }
            : { type: "paragraph", content: [{ type: "text", text: "a " }, { type: "mathInline", attrs: { latex } }, { type: "text", text: " b" }] },
          { type: "paragraph", content: [{ type: "text", text: "after" }] },
        ],
      };
      const out = serializeContent(doc, fmt, extensions) as string;
      const back: any = parseContent(out, fmt, extensions);
      const found = type === "math"
        ? back.content.find((n: any) => n.type === "math")
        : back.content.flatMap((n: any) => n.content ?? []).find((n: any) => n.type === "mathInline");
      assert(found, `[${fmt}] ${name}: math node lost on round trip\n${out}`);
      assert(found.attrs.latex === latex, `[${fmt}] ${name}: latex changed\n  want ${JSON.stringify(latex)}\n  got  ${JSON.stringify(found.attrs.latex)}`);
      const paras = back.content.filter((n: any) => n.type === "paragraph").map((n: any) => n.content?.[0]?.text);
      assert(paras[0] === "before" && paras[paras.length - 1] === "after", `[${fmt}] ${name}: surrounding paragraphs corrupted (${JSON.stringify(paras)})`);
    }
  }

  // Syntax choice: simple latex must use the compact custom syntax, not HTML.
  const simple = serializeContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "mathInline", attrs: { latex: "x" } }] }, { type: "math", attrs: { latex: "y", display: true } }] } as any, "markdown", extensions) as string;
  assert(simple.includes("$x$") && simple.includes("$$y$$") && !simple.includes("data-rte-math"), `simple math should serialize as $..$ / $$..$$, got:\n${simple}`);
  // ...and a lone currency amount must NOT be mistaken for math.
  const money: any = parseContent("It costs $5 and $10 total.", "markdown", extensions);
  assert(JSON.stringify(money).indexOf("mathInline") === -1, "\"$5 and $10\" was wrongly parsed as inline math");

  console.log("✔ math regression assertions passed (round trips in markdown + html; multi-line, indentation, $ fallback, currency)");
}
