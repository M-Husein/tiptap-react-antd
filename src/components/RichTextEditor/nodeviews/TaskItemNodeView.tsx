import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from "@tiptap/react";
import { Checkbox } from "antd";

/**
 * Editor-only NodeView for `taskItem` (spec: checklist / task list),
 * rendering an Ant Design `Checkbox` instead of the extension's default
 * bare `<input type="checkbox">` — so the editor's checklist visually
 * matches the Viewer's (see viewer/renderer/nodes.tsx's `taskItem`
 * renderer, which uses the same `Checkbox` component in a disabled
 * state).
 *
 * The checkbox and the rich-text content are siblings, not nested inside
 * each other — antd's `<Checkbox>children</Checkbox>` pattern wraps its
 * children in a clickable label, which would fight with ProseMirror's own
 * click-to-place-cursor handling inside the editable content area. Kept
 * apart like Tiptap's own reference TaskItem NodeView does.
 */
export const TaskItemNodeView = ({ node, updateAttributes, editor }: ReactNodeViewProps) => {
  const checked = Boolean(node.attrs.checked);

  return (
    <NodeViewWrapper as="li" className="rte-task-item" data-checked={checked}>
      <span className="rte-task-item-checkbox" contentEditable={false}>
        <Checkbox
          checked={checked}
          disabled={!editor.isEditable}
          onChange={(e) => updateAttributes({ checked: e.target.checked })}
        />
      </span>
      <NodeViewContent className="rte-task-item-content" />
    </NodeViewWrapper>
  );
};
