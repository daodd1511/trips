import {
  CircleDashed,
  Coffee,
  EggFried,
  Gift,
  IceCreamCone,
  Lamp,
  type LucideIcon,
  Mountain,
  Sandwich,
  Soup,
  Tag,
  Utensils,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  breakfast: EggFried,
  lunch: Soup,
  dinner: Utensils,
  "snack / street food": Sandwich,
  "café / drinks": Coffee,
  dessert: IceCreamCone,
  "gift / souvenir": Gift,
  sightseeing: Mountain,
  "night market": Lamp,
  other: CircleDashed,
};

/** The fixed icon for a seeded category, or `Tag` for one the user created. */
export function categoryIcon(name: string): LucideIcon {
  return ICONS[name.normalize("NFC").toLowerCase()] ?? Tag;
}

/** Short label for tiles: the part before ` / `, with short forms for the longest seeded names. */
export function categoryShortName(name: string): string {
  const key = name.toLowerCase();
  if (key === "night market") return "Night";
  if (key === "sightseeing") return "Sights";
  return name.split(" / ")[0] ?? name;
}
