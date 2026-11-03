import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field, FieldStack } from "@/components/form/Field";
import { PalettePicker } from "@/components/theme/PalettePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldStack>
      <Field label="Trip name" htmlFor="trip-name" error={nameError}>
        <Input id="trip-name" placeholder="Đà Lạt" aria-invalid={!!nameError} {...form.register("name")} />
      </Field>
      <Field label="Currency" htmlFor="trip-currency" hint={currencyLockedReason}>
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
      </Field>
      <Field label="Palette">
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
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {submitLabel}
      </Button>
      </FieldStack>
    </form>
  );
}
