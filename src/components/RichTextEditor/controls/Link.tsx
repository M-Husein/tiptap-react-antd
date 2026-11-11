import { forwardRef, useState } from "react";
import { Modal, Form, Input, Select, Button, Typography, type ButtonProps } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { NodeSelection } from "@tiptap/pm/state";
import { useRichTextEditor } from "../Context";

export interface LinkProps extends Omit<ButtonProps, "onClick"> {}

const TARGET_OPTIONS = [
  { value: "", label: "None" },
  { value: "_self", label: "_self" },
  { value: "_blank", label: "_blank" },
  { value: "_parent", label: "_parent" },
  { value: "_top", label: "_top" },
];

interface LinkFormValues {
  href: string;
  text: string;
  target: string;
  rel: string;
  tabIndex: string;
  title: string;
  ariaLabel: string;
}

const EMPTY_VALUES: LinkFormValues = {
  href: "",
  text: "",
  target: "",
  rel: "",
  tabIndex: "",
  title: "",
  ariaLabel: "",
};

/**
 * Editor control — opens an Ant Design Modal to create or edit a link.
 * Not a Toolbar (RULE 4/5/6) — place it wherever, e.g. `<Space><Bold />
 * <Italic /><Link /></Space>`.
 *
 * Link content can be either text or an Image: if the current selection
 * is an Image/ImageInline node when the modal opens, the Text field is
 * hidden and the link mark is applied directly to that image instead of
 * to text — the Image's own serialization rules are unaffected either way
 * (see nodes/Image/markdown.ts's describeImageForMarkdown, which the
 * Markdown serializer composes with the Link's own capability check).
 */
export const Link = forwardRef<HTMLButtonElement, LinkProps>((props, ref) => {
  const editor = useRichTextEditor();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LinkFormValues>(EMPTY_VALUES);
  const [isImageTarget, setIsImageTarget] = useState(false);
  const [hasExistingLink, setHasExistingLink] = useState(false);

  if (!editor) return null;

  const openModal = () => {
    const { selection } = editor.state;
    const imageSelected =
      selection instanceof NodeSelection &&
      ["image", "imageInline"].includes(selection.node.type.name);
    setIsImageTarget(imageSelected);

    const attrs = editor.getAttributes("link") as Record<string, unknown>;
    const existing = Boolean(attrs?.href);
    setHasExistingLink(existing);

    const selectedText =
      !imageSelected && !selection.empty
        ? editor.state.doc.textBetween(selection.from, selection.to, "")
        : "";

    setValues({
      href: (attrs?.href as string) ?? "",
      text: selectedText,
      target: (attrs?.target as string) ?? "",
      rel: (attrs?.rel as string) ?? "",
      tabIndex: attrs?.tabIndex != null ? String(attrs.tabIndex) : "",
      title: (attrs?.title as string) ?? "",
      ariaLabel: (attrs?.ariaLabel as string) ?? "",
    });
    setOpen(true);
  };

  const buildAttrs = () => ({
    href: values.href,
    target: values.target || null,
    rel: values.rel || null,
    tabIndex: values.tabIndex !== "" ? Number(values.tabIndex) : null,
    title: values.title || null,
    ariaLabel: values.ariaLabel || null,
  });

  const apply = () => {
    if (!values.href) return; // URL is required
    const linkAttrs = buildAttrs();

    if (isImageTarget) {
      // Link wraps the already-selected image node — no text involved.
      editor.chain().focus().setMark("link", linkAttrs).run();
      setOpen(false);
      return;
    }

    const { selection } = editor.state;
    const label = values.text || values.href; // spec: empty Text -> use URL as label
    const chain = editor.chain().focus();
    if (hasExistingLink) chain.extendMarkRange("link");

    const originalText = selection.empty
      ? ""
      : editor.state.doc.textBetween(selection.from, selection.to, "");

    if (values.text && values.text !== originalText) {
      // Text field was authored/changed by the user -> replace content.
      chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: linkAttrs }] });
    } else if (selection.empty && !hasExistingLink) {
      // Nothing selected, no existing link under the cursor -> insert new.
      chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: linkAttrs }] });
    } else {
      // Keep the existing/selected text, just (re)apply the mark.
      chain.setMark("link", linkAttrs);
    }
    chain.run();
    setOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetMark("link").run();
    setOpen(false);
  };

  return (
    <>
      <Button
        ref={ref}
        type={editor.isActive("link") ? "primary" : "default"}
        icon={<LinkOutlined />}
        onClick={openModal}
        {...props}
      />
      <Modal
        title={hasExistingLink ? "Edit link" : "Insert link"}
        open={open}
        onCancel={() => setOpen(false)}
        okButtonProps={{ disabled: !values.href }}
        onOk={apply}
        footer={(_, { CancelBtn, OkBtn }) => (
          <>
            {hasExistingLink && (
              <Button danger onClick={removeLink} style={{ marginRight: "auto" }}>
                Remove link
              </Button>
            )}
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        <Form layout="vertical" onFinish={apply}>
          <Form.Item label="URL" required>
            <Input
              value={values.href}
              onChange={(e) => setValues((v) => ({ ...v, href: e.target.value }))}
              placeholder="https://example.com"
              autoFocus
            />
          </Form.Item>

          {isImageTarget ? (
            <Typography.Paragraph type="secondary">
              Applying this link to the selected image.
            </Typography.Paragraph>
          ) : (
            <Form.Item label="Text" extra="Leave empty to use the URL as the link text.">
              <Input
                value={values.text}
                onChange={(e) => setValues((v) => ({ ...v, text: e.target.value }))}
                placeholder="Example website"
              />
            </Form.Item>
          )}

          <Form.Item label="Target">
            <Select
              value={values.target}
              onChange={(target) => setValues((v) => ({ ...v, target }))}
              options={TARGET_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            label="Rel"
            extra={
              values.target === "_blank" && !values.rel
                ? 'Consider "noopener noreferrer" when Target is _blank.'
                : undefined
            }
          >
            <Input
              value={values.rel}
              onChange={(e) => setValues((v) => ({ ...v, rel: e.target.value }))}
              placeholder="noopener noreferrer"
            />
          </Form.Item>

          <Form.Item label="Tab Index">
            <Input
              value={values.tabIndex}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^-?\d+$/.test(v)) {
                  setValues((prev) => ({ ...prev, tabIndex: v }));
                }
              }}
              placeholder="0"
              inputMode="numeric"
            />
          </Form.Item>

          <Form.Item label="Title">
            <Input
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            />
          </Form.Item>

          <Form.Item label="ARIA Label">
            <Input
              value={values.ariaLabel}
              onChange={(e) => setValues((v) => ({ ...v, ariaLabel: e.target.value }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});

Link.displayName = "Link";
