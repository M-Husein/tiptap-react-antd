import { useEffect, useState, useSyncExternalStore } from "react";
import type { CodeBlockTheme } from "../types";
import { CodeBlockHeader } from "./CodeBlockHeader";
import { highlightLines, plainLines, type HighlightedLine } from "./highlight";
import { prefersDark, subscribeSystemTheme } from "./theme";

export interface CodeBlockStaticProps {
  code: string;
  language: string;
  defaultTheme?: CodeBlockTheme;
}

/**
 * The Viewer's code block: same frame and header as the Editor's, with
 * the code rendered as static, syntax-highlighted lines — no CodeMirror
 * `EditorView` is ever created (spec 24.2, RULE 21). Shows unhighlighted
 * lines immediately and swaps in the highlighted ones once the language's
 * parser has loaded (lazily — see language-loader.ts).
 *
 * The theme here is local and runtime-only: changing it affects this
 * block for this page view and is never written anywhere (RULE 15).
 */
export const CodeBlockStatic = ({ code, language, defaultTheme = "system" }: CodeBlockStaticProps) => {
  const [theme, setTheme] = useState<CodeBlockTheme>(defaultTheme);
  // useSyncExternalStore (not an effect + state) so "system" is also
  // correct under server rendering: the server snapshot is always light.
  const systemDark = useSyncExternalStore(subscribeSystemTheme, prefersDark, () => false);
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  const [lines, setLines] = useState<HighlightedLine[]>(() => plainLines(code));
  useEffect(() => {
    let cancelled = false;
    setLines(plainLines(code));
    highlightLines(code, language)
      .then((highlighted) => {
        if (!cancelled && highlighted) setLines(highlighted);
      })
      .catch(() => {
        /* a language that fails to load just stays unhighlighted */
      });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className={`rte-codeblock rte-codeblock--${resolved}`} data-language={language}>
      <CodeBlockHeader language={language} theme={theme} onThemeChange={setTheme} getCode={() => code} />
      <pre className="rte-codeblock__pre">
        <code>
          {lines.map((line, i) => (
            <span className="rte-code-line" key={i}>
              {line.map((tok, j) =>
                tok.cls ? (
                  <span className={tok.cls} key={j}>
                    {tok.text}
                  </span>
                ) : (
                  tok.text
                ),
              )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
};
