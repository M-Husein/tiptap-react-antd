/**
 * Copies plain text (never formatting — spec 24.20). Uses the async
 * Clipboard API, which only exists in secure contexts (https/localhost);
 * on plain http, or if permission is denied, falls back to a hidden
 * textarea + `execCommand("copy")`. Resolves to whether it worked, so the
 * caller can show honest feedback instead of "Copied" after a failure.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus(); // iOS Safari only copies from a focused field with an explicit range
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
};
