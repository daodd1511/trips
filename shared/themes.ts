/** Palette keys a trip can use. Tokens for each live in the web stylesheet. */
export const THEME_KEYS = ["pine-berry", "sea-coral", "lantern", "rice-gold", "ink-chili"] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

export const DEFAULT_THEME: ThemeKey = "pine-berry";

export function isThemeKey(value: string): value is ThemeKey {
  return (THEME_KEYS as readonly string[]).includes(value);
}
