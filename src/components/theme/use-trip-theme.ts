import { useEffect } from "react";
import { DEFAULT_THEME, type ThemeKey } from "../../../shared/themes.ts";

const THEME_COLOR: Record<ThemeKey, string> = {
  "pine-berry": "#123a2b",
  "sea-coral": "#0c3a4d",
  lantern: "#103f40",
  "rice-gold": "#34421c",
  "ink-chili": "#18181b",
};

function apply(theme: ThemeKey): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

/**
 * Applies a trip palette to the document root, so portalled drawers and dialogs inherit
 * it, and matches the browser chrome color. With `restoreTo`, unmounting puts that
 * palette back; use it for a temporary preview.
 */
export function useTripTheme(theme: ThemeKey | undefined, restoreTo?: ThemeKey): void {
  useEffect(() => {
    apply(theme ?? DEFAULT_THEME);
  }, [theme]);

  useEffect(() => {
    if (!restoreTo) return;
    return () => apply(restoreTo);
  }, [restoreTo]);
}
