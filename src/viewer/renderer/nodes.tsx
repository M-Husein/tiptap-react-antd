import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { Checkbox } from "antd";
import { renderMarks, type MarkRenderer } from "./marks";

export interface RenderContext {
  markRegistry: Record<string, MarkRenderer>;
  nodeRegistry: Record<string, NodeRenderer>;
}

export type NodeRenderer = (
  node: JSONContent,
  key: string,
  ctx: RenderContext,
  renderChildren: (nodes: JSONContent[] | undefined, ctx: RenderContext) => ReactNode,
) => ReactNode;

const renderInline = (
  nodes: JSONContent[] | undefined,
  ctx: RenderContext,
): ReactNode =>
  (nodes ?? []).map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === "text") {
      return renderMarks(node.marks, node.text ?? "", ctx.markRegistry, key);
    }
    if (node.type === "hardBreak") return <br key={key} />;
    const renderer = ctx.nodeRegistry[node.type ?? ""];
    if (!renderer) return null;
    // Marks apply to any node whose schema allows them, not just text
    // (spec: "Image Inside Link") — e.g. an imageInline node carrying a
    // "link" mark gets wrapped in <a> the same way marked text does.
    return renderMarks(node.marks, renderer(node, key, ctx, renderChildren), ctx.markRegistry, key);
  });

const renderChildren = (
  nodes: JSONContent[] | undefined,
  ctx: RenderContext,
): ReactNode =>
  (nodes ?? []).map((node, index) => {
    const key = `${node.type}-${index}`;
    const renderer = ctx.nodeRegistry[node.type ?? ""];
    if (!renderer) return null; // unknown node type: skip gracefully
    // Same reasoning as renderInline above — a block node (e.g. a block
    // `image`) can carry a "link" mark too.
    return renderMarks(node.marks, renderer(node, key, ctx, renderChildren), ctx.markRegistry, key);
  });

export { renderInline, renderChildren };

/**
 * Phase 1 nodes. This is the "shared presentation" layer referenced in
 * spec section 32/13 — Phase 5+ node folders (nodes/Image, nodes/Video,
 * nodes/Math, nodes/Mermaid, ...) each contribute a `viewer/*View.tsx`
 * that plugs into this same registry via `mergeNodeRenderers`, so Editor
 * and Viewer keep rendering those nodes identically without the Viewer
 * ever touching ProseMirror/NodeViews.
 */
export const defaultNodeRenderers: Record<string, NodeRenderer> = {
  doc: (node, key, ctx) => <div key={key}>{renderChildren(node.content, ctx)}</div>,
  paragraph: (node, key, ctx) => <p key={key}>{renderInline(node.content, ctx)}</p>,
  heading: (node, key, ctx) => {
    const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
    const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    return <Tag key={key}>{renderInline(node.content, ctx)}</Tag>;
  },
  bulletList: (node, key, ctx) => <ul key={key}>{renderChildren(node.content, ctx)}</ul>,
  orderedList: (node, key, ctx) => (
    <ol key={key} start={Number(node.attrs?.start ?? 1)}>
      {renderChildren(node.content, ctx)}
    </ol>
  ),
  listItem: (node, key, ctx) => <li key={key}>{renderChildren(node.content, ctx)}</li>,
  taskList: (node, key, ctx) => (
    <ul key={key} data-type="taskList">
      {renderChildren(node.content, ctx)}
    </ul>
  ),
  taskItem: (node, key, ctx) => (
    <li key={key} className="rte-task-item" data-type="taskItem" data-checked={Boolean(node.attrs?.checked)}>
      <span className="rte-task-item-checkbox">
        <Checkbox checked={Boolean(node.attrs?.checked)} disabled />
      </span>
      <div className="rte-task-item-content">{renderChildren(node.content, ctx)}</div>
    </li>
  ),
  blockquote: (node, key, ctx) => (
    <blockquote key={key}>{renderChildren(node.content, ctx)}</blockquote>
  ),
  codeBlock: (node, key) => {
    const code = (node.content ?? []).map((t) => t.text ?? "").join("");
    const language = String(node.attrs?.language ?? "plaintext");
    // Spec RULE 21: Viewer must not initialize CodeMirror. Static <pre><code>
    // plus (optionally, in a future pass) a lightweight highlighter is used
    // instead — see spec 24.2.
    return (
      <pre key={key} data-language={language}>
        <code>{code}</code>
      </pre>
    );
  },
  horizontalRule: (_node, key) => <hr key={key} />,
  hardBreak: (_node, key) => <br key={key} />,
};

export const mergeNodeRenderers = (
  overrides?: Record<string, NodeRenderer>,
): Record<string, NodeRenderer> => ({
  ...defaultNodeRenderers,
  ...overrides,
});
