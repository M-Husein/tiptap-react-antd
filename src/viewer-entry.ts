export { RichTextViewer } from "./components/RichTextViewer/RichTextViewer";
export type { RichTextViewerProps } from "./components/RichTextViewer/RichTextViewer";

export {
  defaultNodeRenderers,
  mergeNodeRenderers,
} from "./viewer/renderer/nodes";
export type { NodeRenderer, RenderContext } from "./viewer/renderer/nodes";

export {
  defaultMarkRenderers,
  mergeMarkRenderers,
} from "./viewer/renderer/marks";
export type { MarkRenderer } from "./viewer/renderer/marks";

// Phase 4/5 shared presentation for viewer-only bundles
export { tableNodeRenderers } from "./editor/extensions/table";
export { imageNodeRenderers } from "./nodes/Image/viewer/ImageView";
export { ImageFigure, ImageInlineSpan } from "./nodes/Image/shared/ImageFigure";

// Phase 6 shared presentation for viewer-only bundles
export { videoNodeRenderers } from "./nodes/Video/viewer/VideoView";
export { VideoPlayer } from "./nodes/Video/shared/VideoPlayer";
export { audioNodeRenderers } from "./nodes/Audio/viewer/AudioView";
export { AudioPlayer } from "./nodes/Audio/shared/AudioPlayer";
export { createEmbedNodeRenderers } from "./nodes/Embed/viewer/EmbedView";
export { EmbedFrame } from "./nodes/Embed/shared/EmbedFrame";
export { resolveEmbed, EMBED_SANDBOX } from "./nodes/Embed/security";
export type {
  EmbedProvider,
  ResolvedEmbed,
  EmbedValidationOptions,
} from "./nodes/Embed/security";

// Phase 7 shared presentation for viewer-only bundles
export { mathNodeRenderers } from "./nodes/Math/viewer/MathView";
export { MathView } from "./nodes/Math/shared/MathView";

// Phase 9 shared presentation for viewer-only bundles. The highlighter
// lazy-loads CodeMirror's language packages with import(); no EditorView is
// ever created (spec 24.2).
export { createCodeBlockNodeRenderers, codeBlockNodeRenderers } from "./nodes/CodeBlock/viewer/CodeBlockView";
export { CodeBlockStatic } from "./nodes/CodeBlock/shared/CodeBlockStatic";
export { CODE_LANGUAGES, resolveCodeLanguage, codeLanguageLabel } from "./nodes/CodeBlock/languages";
export type { CodeLanguage } from "./nodes/CodeBlock/languages";
export type { CodeBlockTheme } from "./nodes/CodeBlock/types";

export type {
  ContentFormat,
  ContentValue,
  JSONContent,
} from "./editor/types";
