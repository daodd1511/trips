import type { ThemeKey } from "../../shared/themes.ts";

/** Display names and swatch colors for each palette. Tokens live in `index.css`. */
export const PALETTES: readonly { key: ThemeKey; name: string; main: string; accent: string }[] = [
  { key: "pine-berry", name: "Pine & Berry", main: "#123a2b", accent: "#d6245c" },
  { key: "sea-coral", name: "Sea & Coral", main: "#0c3a4d", accent: "#ff6b57" },
  { key: "lantern", name: "Lantern", main: "#103f40", accent: "#f6c343" },
  { key: "rice-gold", name: "Rice & Gold", main: "#34421c", accent: "#e0a325" },
  { key: "ink-chili", name: "Ink & Chili", main: "#18181b", accent: "#d92a24" },
];

/** Currencies offered when creating a trip. */
export const CURRENCIES: readonly { code: string; name: string }[] = [
  { code: "VND", name: "Vietnamese dong" },
  { code: "THB", name: "Thai baht" },
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "JPY", name: "Japanese yen" },
  { code: "KRW", name: "South Korean won" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "MYR", name: "Malaysian ringgit" },
  { code: "IDR", name: "Indonesian rupiah" },
  { code: "LAK", name: "Lao kip" },
  { code: "KHR", name: "Cambodian riel" },
];
