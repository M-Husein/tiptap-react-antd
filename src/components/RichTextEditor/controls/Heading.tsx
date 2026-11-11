import { forwardRef } from "react";
import { Select, type RefSelectProps } from "antd";
import { useRichTextEditor } from "../Context";

export interface HeadingProps {
  /** Which heading levels to offer. Defaults to all six (1-6) plus "Paragraph". */
  levels?: (1 | 2 | 3 | 4 | 5 | 6)[];
  style?: React.CSSProperties;
  className?: string;
}

/** Editor control — sets the block to a paragraph or a heading level. */
export const Heading = forwardRef<RefSelectProps, HeadingProps>(
  ({ levels = [1, 2, 3, 4, 5, 6], style, className }, ref) => {
    const editor = useRichTextEditor();
    if (!editor) return null;

    const current =
      levels.find((level) => editor.isActive("heading", { level })) ?? 0;

    return (
      <Select
        ref={ref}
        style={{ width: 105, ...style }}
        className={className}
        value={current}
        onChange={(level: number) => {
          if (level === 0) {
            editor.chain().focus().setParagraph().run();
          } else {
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
              .run();
          }
        }}
        options={[
          { value: 0, label: "Paragraph" },
          ...levels.map((level) => ({ value: level, label: `Heading ${level}` })),
        ]}
      />
    );
  },
);

Heading.displayName = "Heading";
