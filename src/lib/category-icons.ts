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

/** Short label for tiles: the part before ` / `, and "Night" for Night market. */
export function categoryShortName(name: string): string {
  if (name.toLowerCase() === "night market") return "Night";
  return name.split(" / ")[0] ?? name;
}
