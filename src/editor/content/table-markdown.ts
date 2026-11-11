/**
 * Pure JSON -> Markdown/HTML table serialization (spec 5.4 / 18.1).
 * Deliberately has no React/JSX or viewer-renderer dependency so it can be
 * used from the headless content pipeline without pulling viewer code into
 * the editor bundle (or vice versa) — see src/editor/extensions/table.tsx
 * for the Tiptap extensions + viewer node renderers that build on this.
 */

import type { JSONContent } from "@tiptap/core";
import type { MarkdownRepresentation } from "../types";

const cellText = (cell: JSONContent): string =>
  (cell.content ?? [])
    .map((block) => (block.content ?? []).map((t) => t.text ?? "").join(""))
    .join(" ")
    .replace(/\|/g, "\\|")
    .trim();

const isAdvancedTable = (table: JSONContent): boolean => {
  if (table.attrs && Object.keys(table.attrs).some((k) => k !== "class")) {
    return true;
  }
  for (const row of table.content ?? []) {
    for (const cell of row.content ?? []) {
      const attrs = cell.attrs ?? {};
      // Only merged cells force the HTML path. `colwidth` is deliberately
      // NOT a trigger: every table now gets default per-column widths on
      // insert (see controls/Table.tsx), and a column width can't be
      // expressed in GFM markdown anyway — so treating it as "advanced"
      // would turn every plain table into a raw-HTML block for no gain
      // (tableToHtml below doesn't even emit widths). Merged cells, which
      // GFM genuinely can't represent, still go to HTML.
      if (
        (attrs.colspan && Number(attrs.colspan) > 1) ||
        (attrs.rowspan && Number(attrs.rowspan) > 1)
      ) {
        return true;
      }
    }
  }
  return false;
};

const cellHtml = (cell: JSONContent, tag: "td" | "th"): string => {
  const attrs = cell.attrs ?? {};
  const attrPairs = [
    attrs.colspan && Number(attrs.colspan) > 1 ? `colspan="${attrs.colspan}"` : "",
    attrs.rowspan && Number(attrs.rowspan) > 1 ? `rowspan="${attrs.rowspan}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<${tag}${attrPairs ? " " + attrPairs : ""}>${cellText(cell)}</${tag}>`;
};

const tableToHtml = (table: JSONContent): string => {
  const rows = (table.content ?? [])
    .map((row) => {
      const cells = (row.content ?? [])
        .map((cell) => cellHtml(cell, cell.type === "tableHeader" ? "th" : "td"))
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table>${rows}</table>`;
};

const tableToMarkdown = (table: JSONContent): string => {
  const rows = table.content ?? [];
  if (rows.length === 0) return "";
  const headerRow = rows[0];
  const headerCells = (headerRow.content ?? []).map((c) => cellText(c));
  const bodyRows = rows
    .slice(1)
    .map((row) => (row.content ?? []).map((c) => cellText(c)));

  const header = `| ${headerCells.join(" | ")} |`;
  const divider = `| ${headerCells.map(() => "---").join(" | ")} |`;
  const body = bodyRows.map((cells) => `| ${cells.join(" | ")} |`).join("\n");

  return [header, divider, body].filter(Boolean).join("\n");
};

/** Serializes one `table` JSONContent node per the hybrid strategy. */
export const serializeTable = (table: JSONContent): MarkdownRepresentation =>
  isAdvancedTable(table)
    ? { type: "html", value: tableToHtml(table) }
    : { type: "native", value: tableToMarkdown(table) };
