import type { CodeBlockTheme } from "../types";

const QUERY = "(prefers-color-scheme: dark)";

export const prefersDark = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches;

/** "system" -> whatever the OS currently prefers; "light"/"dark" are fixed. */
export const resolveTheme = (theme: CodeBlockTheme): "light" | "dark" =>
  theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

/** Calls `cb` when the OS light/dark preference changes. Returns an unsubscribe. */
export const subscribeSystemTheme = (cb: () => void): (() => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
};
