import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Select } from "antd";
import { CODE_LANGUAGES, resolveCodeLanguage } from "../languages";
import type { CodeBlockTheme } from "../types";
import { copyText } from "./clipboard";

const LANGUAGE_OPTIONS = CODE_LANGUAGES.map((l) => ({ value: l.id, label: l.label }));
const ALIASES = new Map(CODE_LANGUAGES.map((l) => [l.id, l.aliases]));

// A number (not `false`) so antd keeps the virtual list enabled
// (@rc-component/select disables it for `popupMatchSelectWidth={false}`).
// 220px is the widest label ("Closure Stylesheets (GSS)") plus padding.
const LANGUAGE_DROPDOWN_WIDTH = 220;
const LANGUAGE_LIST_HEIGHT = 256;

const THEME_OPTIONS: Array<{ value: CodeBlockTheme; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Inline SVG, not @ant-design/icons: this component is shared with the
// Viewer, whose bundle must not import the icon package (see
// scripts/check-viewer-bundle.mjs).
const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </svg>
);

export interface CodeBlockHeaderProps {
  /** Stored language string (id, alias, or unknown). */
  language: string;
  theme: CodeBlockTheme;
  onThemeChange: (theme: CodeBlockTheme) => void;
  /**
   * Present in the Editor: renders the language as an antd `<Select>`.
   * Absent in the Viewer, where the language is document data a reader
   * can't change, so it's a plain label.
   */
  onLanguageChange?: (id: string) => void;
  /** Editor locked via `readOnly` -> the language Select is disabled. */
  editable?: boolean;
  /** Called at click time so the Editor copies what's in CodeMirror right now. */
  getCode: () => string;
}

/**
 * The bar above every code block — shared by Editor and Viewer so they
 * can't drift visually (spec 8.1): language, theme, copy.
 */
export const CodeBlockHeader = ({
  language,
  theme,
  onThemeChange,
  onLanguageChange,
  editable = true,
  getCode,
}: CodeBlockHeaderProps) => {
  const resolved = resolveCodeLanguage(language);
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const languageOptions = useMemo(
    // A language the registry doesn't know (e.g. pasted from elsewhere)
    // still has to display as itself rather than as a blank Select.
    () => (resolved ? LANGUAGE_OPTIONS : [{ value: language, label: language }, ...LANGUAGE_OPTIONS]),
    [resolved, language],
  );

  const onCopy = async () => {
    const ok = await copyText(getCode());
    setCopied(ok ? "ok" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 1500);
  };

  return (
    <div className="rte-codeblock__header">
      {onLanguageChange ? (
        <Select
          className="rte-codeblock__select"
          size="small"
          variant="filled"
          aria-label="Code language"
          disabled={!editable}
          value={resolved?.id ?? language}
          options={languageOptions}
          popupMatchSelectWidth={LANGUAGE_DROPDOWN_WIDTH}
          virtual
          listHeight={LANGUAGE_LIST_HEIGHT}
          // popupMatchSelectWidth={false}
          // filterOption={(input, option) => {
          //   const q = input.trim().toLowerCase();
          //   if (!q) return true;
          //   const o = option as { value: string; label: string };
          //   return (
          //     o.label.toLowerCase().includes(q) ||
          //     o.value.includes(q) ||
          //     (ALIASES.get(o.value) ?? []).some((a) => a.includes(q))
          //   );
          // }}
          showSearch={{
            filterOption: (input, option) => {
              const q = input.trim().toLowerCase();
              if (!q) return true;
              const o = option as { value: string; label: string };
              return (
                o.label.toLowerCase().includes(q) ||
                o.value.includes(q) ||
                (ALIASES.get(o.value) ?? []).some((a) => a.includes(q))
              );
            }
          }}
          onChange={onLanguageChange}
        />
      ) : (
        <span className="rte-codeblock__lang">{resolved?.label ?? language}</span>
      )}

      <div className="rte-codeblock__actions">
        <Button
          className="rte-codeblock__copy"
          size="small"
          type="text"
          aria-label="Copy code"
          icon={copied === "ok" ? <CheckIcon /> : <CopyIcon />}
          onClick={onCopy}
        >
          {copied === "ok" 
            ? "Copied" 
            : copied === "failed" ? 
              "Copy failed" 
              : "Copy"
          }
        </Button>
        <Select
          className="rte-codeblock__select rte-codeblock__select--theme"
          size="small"
          variant="filled"
          aria-label="Code theme"
          value={theme}
          options={THEME_OPTIONS}
          popupMatchSelectWidth={false}
          onChange={onThemeChange}
        />
      </div>
    </div>
  );
};
