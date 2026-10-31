import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parsePrice } from "../../../shared/price.ts";

const QUICK_AMOUNTS_VND = [20_000, 30_000, 50_000, 100_000];

type PriceFieldProps = {
  currency: string;
  pending: boolean;
  /** Receives the price exactly as typed; resolves once saved. */
  onAdd: (price: string) => Promise<unknown>;
};

/** Price-only entry with live parsing and, for VND, one-tap amounts. */
export function PriceField({ currency, pending, onAdd }: PriceFieldProps) {
  const [value, setValue] = useState("");
  const parsed = value.trim() ? parsePrice(value) : null;
  const hint = !parsed
    ? currency === "VND"
      ? "Tap an amount or type one: 49k, 120000, 1.5tr"
      : "Type the amount, for example 120"
    : parsed.ok
      ? `Adds ${formatMoney(parsed.value, currency)}`
      : parsed.error;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed?.ok) return;
    await onAdd(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={currency === "VND" ? "Price, like 49k" : "Price"}
          aria-label="Price"
          aria-invalid={parsed?.ok === false}
          inputMode="text"
          autoComplete="off"
          enterKeyHint="done"
        />
        <Button type="submit" disabled={!parsed?.ok || pending}>
          Add
        </Button>
      </div>
      {currency === "VND" && (
        <div className="mt-2 flex gap-1.5">
          {QUICK_AMOUNTS_VND.map((amount) => (
            <Button
              key={amount}
              type="button"
              size="sm"
              className="flex-1 bg-brand-soft text-brand-deep hover:bg-brand-soft"
              onClick={() => setValue(formatMoneyShort(amount, currency))}
            >
              +{formatMoneyShort(amount, currency)}
            </Button>
          ))}
        </div>
      )}
      <p className={cn("mt-1.5 pl-1 text-xs text-muted-foreground", parsed?.ok === false && "text-danger")} aria-live="polite">
        {hint}
      </p>
    </form>
  );
}
