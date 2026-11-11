import { forwardRef } from "react";
import { Button, type ButtonProps } from "antd";
import { CodeOutlined } from "@ant-design/icons";
import { useRichTextEditor } from "../Context";

export interface CodeBlockProps extends Omit<ButtonProps, "onClick"> {}

/**
 * Editor control — toggles a code block on the current block. Works with
 * the plain code block `createCoreExtensions()` ships; add
 * `createCodeBlockEditorExtensions()` to `extensions` to get the
 * CodeMirror-backed one (language/theme Selects, copy, line numbers).
 * Typing three backticks and a space inserts one too.
 */
export const CodeBlock = forwardRef<HTMLButtonElement, CodeBlockProps>((props, ref) => {
  const editor = useRichTextEditor();
  if (!editor) return null;
  return (
    <Button
      ref={ref}
      type={editor.isActive("codeBlock") ? "primary" : "default"}
      icon={<CodeOutlined />}
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      {...props}
    />
  );
});

CodeBlock.displayName = "CodeBlock";
