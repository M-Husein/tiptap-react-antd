export { RichTextEditor } from "./components/RichTextEditor/RichTextEditor";
export type { RichTextEditorProps } from "./components/RichTextEditor/RichTextEditor";

export { Content } from "./components/RichTextEditor/Content";
export type { ContentProps } from "./components/RichTextEditor/Content";

export {
  RichTextEditorContext,
  useRichTextEditor,
} from "./components/RichTextEditor/Context";

export { Bold } from "./components/RichTextEditor/controls/Bold";
export { Italic } from "./components/RichTextEditor/controls/Italic";
export { Underline } from "./components/RichTextEditor/controls/Underline";
export { Strikethrough } from "./components/RichTextEditor/controls/Strikethrough";
export { Heading } from "./components/RichTextEditor/controls/Heading";
export { BulletList } from "./components/RichTextEditor/controls/BulletList";
export { OrderedList } from "./components/RichTextEditor/controls/OrderedList";
export { Checklist } from "./components/RichTextEditor/controls/Checklist";
export { Link } from "./components/RichTextEditor/controls/Link";
export { Undo } from "./components/RichTextEditor/controls/Undo";
export { Redo } from "./components/RichTextEditor/controls/Redo";
export { FindAndReplace } from "./components/RichTextEditor/controls/FindAndReplace";
export { Table as TableControl } from "./components/RichTextEditor/controls/Table";
export { TableToolbar } from "./components/RichTextEditor/controls/TableToolbar";
export type { TableToolbarProps } from "./components/RichTextEditor/controls/TableToolbar";
export { Image as ImageControl } from "./components/RichTextEditor/controls/Image";

export { createCoreExtensions } from "./editor/extensions/core";
export type { CoreExtensionsOptions } from "./editor/extensions/core";

// Phase 4 — Table
export {
  createTableExtensions,
  tableNodeRenderers,
} from "./editor/extensions/table";
export type { TableExtensionsOptions } from "./editor/extensions/table";

// Phase 5 — Image
export { createImageExtensions, Image as ImageNode, ImageInline as ImageInlineNode } from "./nodes/Image/extension";
export { createImageEditorExtensions } from "./nodes/Image/editor/extensions";
export { imageNodeRenderers } from "./nodes/Image/viewer/ImageView";
export { ImageFigure, ImageInlineSpan } from "./nodes/Image/shared/ImageFigure";
export type {
  ImageAttributes,
  ImageInlineAttributes,
  ImageAlign,
  ImageDisplayMode,
  ImageVerticalAlign,
  ImageWidth,
  ImageResponsive,
} from "./nodes/Image/types";

// Phase 6 — Media (Video, Audio, Embed)
export { Video as VideoControl } from "./components/RichTextEditor/controls/Video";
export { Audio as AudioControl } from "./components/RichTextEditor/controls/Audio";
export { Embed as EmbedControl } from "./components/RichTextEditor/controls/Embed";

export { createVideoExtensions, Video as VideoNode } from "./nodes/Video/extension";
export { videoNodeRenderers } from "./nodes/Video/viewer/VideoView";
export { VideoPlayer } from "./nodes/Video/shared/VideoPlayer";
export type { VideoAttributes } from "./nodes/Video/types";

export { createAudioExtensions, Audio as AudioNode } from "./nodes/Audio/extension";
export { audioNodeRenderers } from "./nodes/Audio/viewer/AudioView";
export { AudioPlayer } from "./nodes/Audio/shared/AudioPlayer";

export { createEmbedExtensions, Embed as EmbedNode } from "./nodes/Embed/extension";
export { createEmbedEditorExtensions } from "./nodes/Embed/editor/extensions";
export { createEmbedNodeRenderers } from "./nodes/Embed/viewer/EmbedView";
export { EmbedFrame } from "./nodes/Embed/shared/EmbedFrame";
export { resolveEmbed, EMBED_SANDBOX } from "./nodes/Embed/security";
export type {
  EmbedProvider,
  ResolvedEmbed,
  EmbedValidationOptions,
} from "./nodes/Embed/security";
export type { EmbedExtensionOptions } from "./nodes/Embed/extension";

// Phase 7 — Math
export { Math as MathControl } from "./components/RichTextEditor/controls/Math";

export { createMathExtensions, Math as MathNode, MathInline as MathInlineNode } from "./nodes/Math/extension";
export { createMathEditorExtensions } from "./nodes/Math/editor/extensions";
export { mathNodeRenderers } from "./nodes/Math/viewer/MathView";
export { MathView } from "./nodes/Math/shared/MathView";
export type { MathAttributes, MathInlineAttributes } from "./nodes/Math/types";

// Phase 9 — CodeBlock (CodeMirror 6)
export { CodeBlock as CodeBlockControl } from "./components/RichTextEditor/controls/CodeBlock";
export { createCodeBlockExtensions, CodeBlock as CodeBlockNode } from "./nodes/CodeBlock/extension";
export type { CodeBlockExtensionOptions } from "./nodes/CodeBlock/extension";
export { createCodeBlockEditorExtensions } from "./nodes/CodeBlock/editor/extensions";
export { createCodeBlockNodeRenderers, codeBlockNodeRenderers } from "./nodes/CodeBlock/viewer/CodeBlockView";
export { CodeBlockStatic } from "./nodes/CodeBlock/shared/CodeBlockStatic";
export { CODE_LANGUAGES, resolveCodeLanguage, codeLanguageLabel } from "./nodes/CodeBlock/languages";
export type { CodeLanguage } from "./nodes/CodeBlock/languages";
export type { CodeBlockTheme, CodeBlockAttributes, CodeBlockRuntimeOptions } from "./nodes/CodeBlock/types";

export type {
  ContentFormat,
  ContentValue,
  ControlledContentProps,
  JSONContent,
  MarkdownRepresentation,
} from "./editor/types";
