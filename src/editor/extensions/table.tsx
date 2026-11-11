/**
 * Phase 4 — Table.
 *
 * Additive to the Phase 1 core set (spec section 9/12): consumers who want
 * tables compose `createTableExtensions()` alongside `createCoreExtensions()`.
 *
 * See src/editor/content/table-markdown.ts for the capability-aware
 * markdown/HTML serialization logic (kept dependency-free from React so it
 * doesn't leak into either bundle unnecessarily).
 */

import type { AnyExtension } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import type { NodeRenderer } from "../../viewer/renderer/nodes";
import { ResizableTable, extractColumnWidths } from "./table-viewer-resize";

export interface TableExtensionsOptions {
  /** Whether columns can be resized by dragging in the editor. Default true. */
  resizable?: boolean;
}

export const createTableExtensions = (
  options: TableExtensionsOptions = {},
): AnyExtension[] => {
  const { resizable = true } = options;
  return [
    // NOTE on `HTMLAttributes.class` below: it only takes effect for
    // *static* HTML generation (jsonToHtml / generateHTML), not for the
    // live editor. When `resizable: true` (the default), Tiptap's own
    // column-resize NodeView (@tiptap/extension-table's `TableView`)
    // takes over DOM construction entirely and ignores HTMLAttributes —
    // it always wraps the table in a bare `<div class="tableWrapper">`
    // with a classless `<table>` inside. That wrapper div is what
    // tableNodeRenderers.table below also emits, and what content.css's
    // `.tableWrapper table` selector targets, so editor/viewer parity
    // holds through that shared structure rather than through this class.
    Table.configure({ resizable, HTMLAttributes: { class: "rte-table" } }),
    TableRow,
    TableHeader,
    TableCell,
  ];
};

export { serializeTable } from "../content/table-markdown";

/** Shared presentation (spec 8.1/32) — used by RichTextViewer via
 * `mergeNodeRenderers`. Wrapped in the same `.tableWrapper` div the
 * editor's resizable NodeView produces (see createTableExtensions above)
 * so one CSS rule styles both without depending on whether the `rte-table`
 * class actually made it onto the `<table>` element in a given context.
 *
 * Resizable by default (drag any column border) via ResizableTable —
 * session-local only, since the Viewer has no write-back path; see that
 * component's own doc comment. */
export const tableNodeRenderers: Record<string, NodeRenderer> = {
  table: (node, key, ctx, renderChildren) => {
    const rows = node.content ?? [];
    const { columnCount, widths } = extractColumnWidths(
      (rows[0]?.content ?? []) as { attrs?: Record<string, unknown> }[],
    );
    return (
      <ResizableTable
        key={key}
        columnCount={Math.max(columnCount, 1)}
        initialWidths={widths}
        className="rte-table"
      >
        <tbody>{renderChildren(rows, ctx)}</tbody>
      </ResizableTable>
    );
  },
  tableRow: (node, key, ctx, renderChildren) => (
    <tr key={key}>{renderChildren(node.content, ctx)}</tr>
  ),
  tableHeader: (node, key, ctx, renderChildren) => (
    <th
      key={key}
      colSpan={Number(node.attrs?.colspan ?? 1)}
      rowSpan={Number(node.attrs?.rowspan ?? 1)}
    >
      {renderChildren(node.content, ctx)}
    </th>
  ),
  tableCell: (node, key, ctx, renderChildren) => (
    <td
      key={key}
      colSpan={Number(node.attrs?.colspan ?? 1)}
      rowSpan={Number(node.attrs?.rowspan ?? 1)}
    >
      {renderChildren(node.content, ctx)}
    </td>
  ),
};
