import { useCallback, useRef, useState, type ReactNode } from "react";

export interface ResizableTableProps {
  columnCount: number;
  /** Per-column starting width in px, from the doc's `colwidth` cell attrs
   * (see extractColumnWidths below). `null` entries fall back to
   * `defaultColumnWidth`. */
  initialWidths: (number | null)[];
  minColumnWidth?: number;
  defaultColumnWidth?: number;
  className?: string;
  /** The already-rendered `<thead>`/`<tbody>` rows — this component only
   * adds the `<colgroup>` and the drag handles around them. */
  children: ReactNode;
}

/**
 * Session-local column resizing for RichTextViewer's table — reader
 * comfort, not document editing. This deliberately does **not** persist
 * back into the canonical document: RichTextViewer has no onChange/write
 * path by design (spec section 8, "Viewer must NOT initialize... editing
 * state"), so widths reset on remount. It mirrors the Editor's drag-to-
 * resize UX using plain pointer events instead of ProseMirror's
 * `columnResizing` plugin, since the Viewer must not construct a
 * ProseMirror instance to get it.
 *
 * Implementation note: the drag handles are rendered as an absolutely
 * positioned overlay spanning the whole table (not attached to individual
 * `<th>`/`<td>` elements) so this component doesn't need to know anything
 * about how rows/cells are rendered — it just wraps whatever `children`
 * (already-rendered rows) came from the normal tableRow/tableHeader/
 * tableCell renderers below.
 */
export const ResizableTable = ({
  columnCount,
  initialWidths,
  minColumnWidth = 40,
  defaultColumnWidth = 120,
  className,
  children,
}: ResizableTableProps) => {
  const [widths, setWidths] = useState<number[]>(() =>
    initialWidths.map((w) => w ?? defaultColumnWidth),
  );
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const handlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { index, startX: e.clientX, startWidth: widths[index] };

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const delta = ev.clientX - drag.startX;
        const next = Math.max(minColumnWidth, drag.startWidth + delta);
        setWidths((prev) => {
          const copy = [...prev];
          copy[drag.index] = next;
          return copy;
        });
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [widths, minColumnWidth],
  );

  let cumulative = 0;
  const boundaries: number[] = [];
  for (let i = 0; i < columnCount - 1; i++) {
    cumulative += widths[i] ?? defaultColumnWidth;
    boundaries.push(cumulative);
  }

  return (
    <div className="tableWrapper rte-table-resizable-wrapper">
      <table className={className} style={{ tableLayout: "fixed", width: cumulative + (widths[columnCount - 1] ?? defaultColumnWidth) }}>
        <colgroup>
          {Array.from({ length: columnCount }).map((_, i) => (
            <col key={i} style={{ width: widths[i] ?? defaultColumnWidth }} />
          ))}
        </colgroup>
        {children}
      </table>
      <div className="rte-table-resize-handles" aria-hidden>
        {boundaries.map((left, i) => (
          <div
            key={i}
            className="rte-table-resize-handle"
            style={{ left }}
            onPointerDown={handlePointerDown(i)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Reads per-column starting widths from the first row's cells, expanding
 * `colspan` so the result always has exactly `columnCount` entries (one
 * per rendered column, matching how ProseMirror's own table schema stores
 * `colwidth` — an array of one width per spanned column on that cell).
 */
export const extractColumnWidths = (
  firstRowCells: { attrs?: Record<string, unknown> }[],
): { columnCount: number; widths: (number | null)[] } => {
  const widths: (number | null)[] = [];
  for (const cell of firstRowCells) {
    const colspan = Number(cell.attrs?.colspan ?? 1);
    const colwidth = cell.attrs?.colwidth as number[] | null | undefined;
    for (let i = 0; i < colspan; i += 1) {
      widths.push(colwidth?.[i] ?? null);
    }
  }
  return { columnCount: widths.length, widths };
};
