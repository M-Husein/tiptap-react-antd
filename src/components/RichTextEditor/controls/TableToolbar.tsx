import { useCallback, useMemo, useRef } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Button, Dropdown, type MenuProps } from "antd";
import {
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  InsertRowLeftOutlined,
  InsertRowRightOutlined,
  DeleteRowOutlined,
  DeleteColumnOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  DeleteOutlined,
  DownOutlined,
  BorderOuterOutlined,
} from "@ant-design/icons";
import type { Editor } from "@tiptap/core";
import type { VirtualElement } from "@floating-ui/dom";
import { useRichTextEditor } from "../Context";

export interface TableToolbarProps {
  /** Extra class on the floating toolbar card. */
  className?: string;
}

/**
 * Walks up from the current selection to the enclosing `table` node and
 * returns its rendered DOM element (the resizable NodeView's
 * `.tableWrapper`, or the `<table>` itself for a plain table) so the
 * floating toolbar can anchor to the whole table — CKEditor-style —
 * instead of to the caret inside one cell.
 */
const findTableDom = (editor: Editor): HTMLElement | null => {
  const { selection } = editor.state;
  const $from = selection.$from;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") {
      const dom = editor.view.nodeDOM($from.before(depth));
      if (dom instanceof HTMLElement) {
        return dom.closest<HTMLElement>(".tableWrapper") ?? dom;
      }
      return null;
    }
  }
  return null;
};

/**
 * Contextual table toolbar (Phase 4, CKEditor-style). Renders a floating
 * card that appears while the caret sits inside a table, grouping the
 * row / column / merge / header operations and a delete-table action.
 *
 * Built on Tiptap's `BubbleMenu`. Two things make the antd dropdowns work
 * inside a bubble menu:
 *  1. `getPopupContainer` points every dropdown at the bubble element
 *     itself, so its portal renders *inside* the menu. That keeps
 *     `element.contains(document.activeElement)` true while a dropdown is
 *     open, so the BubbleMenu plugin's focus-based `shouldShow`/blur logic
 *     doesn't hide the toolbar the moment you click a menu item.
 *  2. `shouldShow`, `options` and `getReferencedVirtualElement` are
 *     memoised on the (stable) editor instance. The BubbleMenu React
 *     wrapper re-dispatches an "updateOptions" transaction whenever any of
 *     those props change identity; since `useEditor` re-renders on every
 *     transaction, inline closures would spin an update loop.
 *
 * Not a Toolbar component (RULE 4/5/6) — drop it anywhere inside
 * `<RichTextEditor>` and it manages its own visibility.
 */
export const TableToolbar = ({ className }: TableToolbarProps) => {
  const editor = useRichTextEditor();
  const menuRef = useRef<HTMLDivElement>(null);

  const shouldShow = useCallback(
    () => Boolean(editor?.isEditable && editor.isActive("table")),
    [editor],
  );

  const getReferencedVirtualElement = useCallback((): VirtualElement | null => {
    if (!editor) return null;
    const dom = findTableDom(editor);
    if (!dom) return null;
    return { getBoundingClientRect: () => dom.getBoundingClientRect() };
  }, [editor]);

  const options = useMemo(
    () =>
      ({
        placement: "top-start",
        offset: 8,
        flip: true,
        shift: true,
      }) as const,
    [],
  );

  const getPopupContainer = useCallback(
    () => menuRef.current ?? document.body,
    [],
  );

  if (!editor) return null;

  const run = (fn: (e: Editor) => void) => () => fn(editor);
  const canMerge = editor.can().mergeCells();
  const canSplit = editor.can().splitCell();

  const rowItems: MenuProps["items"] = [
    { key: "above", icon: <InsertRowAboveOutlined />, label: "Insert row above" },
    { key: "below", icon: <InsertRowBelowOutlined />, label: "Insert row below" },
    { type: "divider" },
    { key: "delete", icon: <DeleteRowOutlined />, label: "Delete row", danger: true },
  ];
  const onRow: MenuProps["onClick"] = ({ key }) => {
    const chain = editor.chain().focus();
    if (key === "above") chain.addRowBefore().run();
    else if (key === "below") chain.addRowAfter().run();
    else if (key === "delete") chain.deleteRow().run();
  };

  const colItems: MenuProps["items"] = [
    { key: "left", icon: <InsertRowLeftOutlined />, label: "Insert column left" },
    { key: "right", icon: <InsertRowRightOutlined />, label: "Insert column right" },
    { type: "divider" },
    { key: "delete", icon: <DeleteColumnOutlined />, label: "Delete column", danger: true },
  ];
  const onCol: MenuProps["onClick"] = ({ key }) => {
    const chain = editor.chain().focus();
    if (key === "left") chain.addColumnBefore().run();
    else if (key === "right") chain.addColumnAfter().run();
    else if (key === "delete") chain.deleteColumn().run();
  };

  const mergeItems: MenuProps["items"] = [
    {
      key: "merge",
      icon: <MergeCellsOutlined />,
      label: "Merge selected cells",
      disabled: !canMerge,
    },
    {
      key: "split",
      icon: <SplitCellsOutlined />,
      label: "Split cell",
      disabled: !canSplit,
    },
  ];
  const onMerge: MenuProps["onClick"] = ({ key }) => {
    const chain = editor.chain().focus();
    if (key === "merge") chain.mergeCells().run();
    else if (key === "split") chain.splitCell().run();
  };

  const headerItems: MenuProps["items"] = [
    { key: "row", label: "Toggle header row" },
    { key: "col", label: "Toggle header column" },
    { key: "cell", label: "Toggle header cell" },
  ];
  const onHeader: MenuProps["onClick"] = ({ key }) => {
    const chain = editor.chain().focus();
    if (key === "row") chain.toggleHeaderRow().run();
    else if (key === "col") chain.toggleHeaderColumn().run();
    else if (key === "cell") chain.toggleHeaderCell().run();
  };

  const dropdownProps = { getPopupContainer, trigger: ["click"] as ("click")[] };

  return (
    <BubbleMenu
      ref={menuRef}
      editor={editor}
      pluginKey="tableToolbar"
      className={["rte-table-toolbar", className].filter(Boolean).join(" ")}
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={options}
      updateDelay={0}
    >
      <Dropdown menu={{ items: rowItems, onClick: onRow }} {...dropdownProps}>
        <Button size="small" type="text" icon={<InsertRowBelowOutlined />}>
          Row <DownOutlined />
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: colItems, onClick: onCol }} {...dropdownProps}>
        <Button size="small" type="text" icon={<InsertRowRightOutlined />}>
          Column <DownOutlined />
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: mergeItems, onClick: onMerge }} {...dropdownProps}>
        <Button
          size="small"
          type="text"
          icon={<MergeCellsOutlined />}
          disabled={!canMerge && !canSplit}
        >
          Merge <DownOutlined />
        </Button>
      </Dropdown>
      <Dropdown menu={{ items: headerItems, onClick: onHeader }} {...dropdownProps}>
        <Button size="small" type="text" icon={<BorderOuterOutlined />}>
          Header <DownOutlined />
        </Button>
      </Dropdown>
      <span className="rte-table-toolbar__sep" aria-hidden />
      <Button
        size="small"
        type="text"
        danger
        icon={<DeleteOutlined />}
        title="Delete table"
        onClick={run((e) => e.chain().focus().deleteTable().run())}
      />
    </BubbleMenu>
  );
};

TableToolbar.displayName = "TableToolbar";
