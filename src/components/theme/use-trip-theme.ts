import { useEffect } from "react";
import { DEFAULT_THEME, type ThemeKey } from "../../../shared/themes.ts";

const THEME_COLOR: Record<ThemeKey, string> = {
  "pine-berry": "#123a2b",
  "sea-coral": "#0c3a4d",
  lantern: "#103f40",
  "rice-gold": "#34421c",
  "ink-chili": "#18181b",
};

/**
 * Applies a trip palette to the document root, so portalled drawers and dialogs inherit
 * it, and matches the browser chrome color. Restores the default palette on unmount.
 */
export function useTripTheme(theme: ThemeKey | undefined): void {
  useEffect(() => {
    const key = theme ?? DEFAULT_THEME;
    document.documentElement.dataset.theme = key;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[key]);
    return () => {
      document.documentElement.dataset.theme = DEFAULT_THEME;
    };
  }, [theme]);
}
