import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { PalettePicker } from "@/components/theme/PalettePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/palettes";
import { THEME_KEYS, type ThemeKey } from "../../../shared/themes.ts";

const schema = z.object({
  name: z.string().trim().min(1, "Give the trip a name").max(200),
  currency: z.string().regex(/^[A-Z]{3}$/),
  theme: z.enum(THEME_KEYS),
});
export type TripFormValues = z.infer<typeof schema>;

type TripFormProps = {
  defaultValues?: Partial<TripFormValues>;
  submitLabel: string;
  pending: boolean;
  /** Shown under the currency select when it is locked. */
  currencyLockedReason?: string;
  onSubmit: (values: TripFormValues) => void | Promise<void>;
  /** Called on palette change, for a live preview. */
  onThemePreview?: (theme: ThemeKey) => void;
};

/** Name, currency, and palette for a trip. */
export function TripForm({
  defaultValues,
  submitLabel,
  pending,
  currencyLockedReason,
  onSubmit,
  onThemePreview,
}: TripFormProps) {
  const form = useForm<TripFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", currency: "VND", theme: "pine-berry", ...defaultValues },
  });
  const nameError = form.formState.errors.name?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="trip-name">Trip name</Label>
        <Input id="trip-name" placeholder="Đà Lạt" aria-invalid={!!nameError} {...form.register("name")} />
        {nameError && <p className="pl-1 text-xs text-danger">{nameError}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="trip-currency">Currency</Label>
        <Controller
          control={form.control}
          name="currency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={!!currencyLockedReason}>
              <SelectTrigger id="trip-currency" ref={field.ref} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {currencyLockedReason && <p className="pl-1 text-xs text-muted-foreground">{currencyLockedReason}</p>}
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Palette</span>
        <Controller
          control={form.control}
          name="theme"
          render={({ field }) => (
            <PalettePicker
              value={field.value}
              onChange={(theme) => {
                field.onChange(theme);
                onThemePreview?.(theme);
              }}
            />
          )}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
