import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PALETTES } from "@/lib/palettes";
import { isThemeKey, type ThemeKey } from "../../../shared/themes.ts";

type PalettePickerProps = {
  value: ThemeKey;
  onChange: (theme: ThemeKey) => void;
};

/** Two-column palette options with a main and accent swatch. */
export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const handleChange = (next: string) => {
    if (isThemeKey(next)) onChange(next);
  };
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleChange}
      aria-label="Palette"
      className="grid w-full grid-cols-2 gap-2"
    >
      {PALETTES.map((p) => (
        <ToggleGroupItem
          key={p.key}
          value={p.key}
          className="h-12 justify-start gap-2.5 rounded-tile bg-sunken px-2.5 text-ink data-[state=on]:bg-background data-[state=on]:text-ink data-[state=on]:ring-2 data-[state=on]:ring-ink"
        >
          <span aria-hidden className="flex h-7 w-10 overflow-hidden rounded-full">
            <span className="flex-1" style={{ background: p.main }} />
            <span className="flex-1" style={{ background: p.accent }} />
          </span>
          {p.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
