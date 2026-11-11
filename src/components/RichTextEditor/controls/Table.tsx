import { forwardRef, useState } from "react";
import { Button, Popover, type ButtonProps } from "antd";
import { TableOutlined } from "@ant-design/icons";
import type { Editor } from "@tiptap/core";
import { useRichTextEditor } from "../Context";

export interface TableProps extends Omit<ButtonProps, "onClick"> {
  /** Largest selectable grid height in the picker. Default 10. */
  maxRows?: number;
  /** Largest selectable grid width in the picker. Default 10. */
  maxCols?: number;
  /** Whether the first inserted row is a header row. Default true. */
  withHeaderRow?: boolean;
  /**
   * Per-column width (px) for a freshly inserted table. Defaults to 32px —
   * the CKEditor behaviour: an empty column is a narrow fixed width and
   * only grows as you type into it (the table does NOT span the editor
   * width by default). It's stored as the cell `colwidth`, so dragging a
   * column border still overrides it per column afterwards.
   */
  columnWidth?: number;
}

/** CKEditor-style minimum width of an empty column. */
const DEFAULT_COLUMN_WIDTH = 32;

/**
 * Writes an explicit `colwidth` onto every cell of the table that
 * currently holds the selection, giving it defined columns the moment
 * it's inserted — the same doc state a table reaches after you drag a
 * column border, applied up front.
 *
 * Done as a direct `setNodeMarkup` transaction rather than by building the
 * table from JSON: `insertContent` round-trips a JSON node through the
 * schema's HTML (de)serialization, which drops the array-valued `colwidth`
 * attr back to `null`. Setting it on the live node preserves it, exactly
 * as the column-resize plugin does.
 */
const applyColumnWidths = (editor: Editor, width: number): void => {
  editor.commands.command(({ tr, state, dispatch }) => {
    const $from = state.selection.$from;
    let tableNode = null;
    let tablePos = -1;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === "table") {
        tableNode = $from.node(depth);
        tablePos = $from.before(depth);
        break;
      }
    }
    if (!tableNode) return false;
    if (!dispatch) return true;

    tableNode.descendants((node, pos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        // pos is relative to the table's content start (tablePos + 1).
        tr.setNodeMarkup(tablePos + 1 + pos, undefined, {
          ...node.attrs,
          colwidth: [width],
        });
      }
      return true;
    });
    dispatch(tr);
    return true;
  });
};

/**
 * CKEditor-style hover grid: a `maxRows × maxCols` matrix where hovering
 * highlights the top-left block and clicking inserts exactly that many
 * rows/columns. Cells `preventDefault` on pointerdown so the editor keeps
 * its selection until the click runs `insertTable`.
 */
const GridPicker = ({
  maxRows,
  maxCols,
  onPick,
}: {
  maxRows: number;
  maxCols: number;
  onPick: (rows: number, cols: number) => void;
}) => {
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: -1, c: -1 });
  const label = hover.r >= 0 ? `${hover.r + 1} × ${hover.c + 1}` : "Pick a size";

  return (
    <div
      className="rte-table-gridpicker"
      onMouseLeave={() => setHover({ r: -1, c: -1 })}
    >
      <div
        className="rte-table-gridpicker__grid"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 16px)` }}
        role="grid"
        aria-label="Table size"
      >
        {Array.from({ length: maxRows * maxCols }).map((_, i) => {
          const r = Math.floor(i / maxCols);
          const c = i % maxCols;
          const active = r <= hover.r && c <= hover.c;
          return (
            <div
              key={i}
              className={
                "rte-table-gridpicker__cell" + (active ? " is-active" : "")
              }
              onMouseEnter={() => setHover({ r, c })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r + 1, c + 1)}
            />
          );
        })}
      </div>
      <div className="rte-table-gridpicker__label">{label}</div>
    </div>
  );
};

/**
 * Editor control (Phase 4) — inserts a table via a CKEditor-style size
 * picker. Requires createTableExtensions(). Not a Toolbar (RULE 4/5/6):
 * place it wherever, e.g. inside a consumer `<Space>`.
 */
export const Table = forwardRef<HTMLButtonElement, TableProps>(
  (
    { maxRows = 10, maxCols = 10, withHeaderRow = true, columnWidth, ...props },
    ref,
  ) => {
    const editor = useRichTextEditor();
    const [open, setOpen] = useState(false);
    if (!editor) return null;

    const canInsert =
      editor.can().insertTable?.({ rows: 2, cols: 2, withHeaderRow }) ?? false;

    const insert = (rows: number, cols: number) => {
      const width = columnWidth ?? DEFAULT_COLUMN_WIDTH;
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
      applyColumnWidths(editor, width);
      setOpen(false);
    };

    return (
      <Popover
        trigger="click"
        open={open && canInsert}
        onOpenChange={setOpen}
        title="Insert table"
        content={
          <GridPicker maxRows={maxRows} maxCols={maxCols} onPick={insert} />
        }
      >
        <Button ref={ref} icon={<TableOutlined />} disabled={!canInsert} {...props} />
      </Popover>
    );
  },
);

Table.displayName = "Table";
