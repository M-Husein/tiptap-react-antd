/**
 * Phase 1 — Core Editor extensions.
 *
 * Paragraph, Heading, Bold, Italic, Underline, Strike, Code, Blockquote,
 * Bullet List, Ordered List, Task List, Hard Break, Horizontal Rule,
 * Link, Undo, Redo.
 *
 * This module must not import Ant Design, Tailwind, or CodeMirror.
 * Later phases (Table, TextStyle/FontFamily/FontSize/LineHeight,
 * CharacterCount, InvisibleCharacters, Image, Media, Math, Diagrams,
 * Advanced Content, Find & Replace, TableOfContents) each get their own
 * module under src/editor/extensions/ and are additive — they are not
 * required for Phase 1-3 to function.
 */

import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Link } from "./link";
import { CodeBlock } from "../../nodes/CodeBlock/extension";

export interface CoreExtensionsOptions {
  /** Placeholder text shown in an empty document. */
  placeholder?: string;
  /** Disable link auto-detection/click-to-open while editing. */
  linkOpenOnClick?: boolean;
  /**
   * Overrides the TaskItem extension instance. Used internally by
   * RichTextEditor to swap in an editor-only NodeView (Ant Design
   * Checkbox — see editor/extensions/task-item.ts) without registering a
   * second same-named extension alongside this one, which Tiptap allows
   * but warns about ("Duplicate extension names found") and resolves via
   * last-registered-wins — an override parameter is cleaner and warning-free.
   * Leave unset for RichTextViewer's plain schema-only usage.
   */
  taskItem?: AnyExtension;
}

/**
 * Builds the Phase 1 extension array. Consumers who need Phase 4+ features
 * (tables, text-style, images, etc.) compose additional extension arrays
 * from src/editor/extensions/*.ts alongside this one.
 */
export const createCoreExtensions = (
  options: CoreExtensionsOptions = {},
): AnyExtension[] => {
  const {
    placeholder,
    linkOpenOnClick = false,
    taskItem = TaskItem.configure({ nested: true }),
  } = options;

  return [
    // Link and Underline are added explicitly below so we control their
    // options/extensions in one place. StarterKit's own codeBlock is
    // disabled in favor of ours (default language "plaintext"; replaceable
    // by name — see merge.ts).
    StarterKit.configure({ codeBlock: false, link: false, underline: false }),
    CodeBlock,
    Underline,
    Link.configure({
      openOnClick: linkOpenOnClick,
      autolink: true,
      linkOnPaste: true,
    }),
    TaskList,
    taskItem,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
};
