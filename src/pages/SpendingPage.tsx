import { MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTrip } from "@/components/layout/AppShell";
import { ExpenseDrawer } from "@/components/spending/ExpenseDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDay, formatMoney, formatMoneyShort, formatShortDate, localToday } from "@/lib/format";
import { useCreateExpense, useExpenses } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { parseQuickEntry } from "../../shared/price.ts";
import type { Expense } from "../../shared/schemas.ts";

function QuickEntry({ tripId, currency, onAdded }: { tripId: number; currency: string; onAdded: (id: number) => void }) {
  const [line, setLine] = useState("");
  const createExpense = useCreateExpense();
  const parsed = line.trim() ? parseQuickEntry(line) : null;
  const hint = !parsed
    ? "Name, then price: banh mi 30k"
    : parsed.ok
      ? `${parsed.value.name} · ${formatMoney(parsed.value.amount, currency)}`
      : parsed.error;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parsed?.ok) return;
    try {
      const expense = await createExpense.mutateAsync({
        tripId,
        input: { ...parsed.value, spentOn: localToday(), placeId: null },
      });
      setLine("");
      onAdded(expense.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the expense");
    }
  };

  return (
    <div className="fixed inset-x-5 bottom-[calc(max(env(safe-area-inset-bottom),16px)+76px)] z-30 mx-auto max-w-[448px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex gap-2 rounded-full bg-background p-1.5 shadow-[0_10px_28px_-10px_rgb(16_32_25/0.35)] ring-1 ring-line"
      >
        <Input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="banh mi 30k"
          aria-label="Quick entry: name, then price"
          aria-invalid={parsed?.ok === false}
          autoComplete="off"
          enterKeyHint="send"
          className="h-10 bg-transparent focus-visible:bg-transparent focus-visible:ring-0"
        />
        <Button type="submit" className="h-10" disabled={!parsed?.ok || createExpense.isPending}>
          Add
        </Button>
      </form>
      <p
        aria-live="polite"
        className={cn("mt-1.5 inline-block rounded-full bg-background px-2.5 py-0.5 text-xs text-muted-foreground", parsed?.ok === false && "text-danger")}
      >
        {hint}
      </p>
    </div>
  );
}

export function SpendingPage() {
  const trip = useTrip();
  const expenses = useExpenses(trip.id);
  const [fresh, setFresh] = useState<number | null>(null);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const data = expenses.data;

  const byDay = new Map<string, Expense[]>();
  for (const e of data?.items ?? []) byDay.set(e.spentOn, [...(byDay.get(e.spentOn) ?? []), e]);
  const chronological = [...(data?.days ?? [])].reverse();

  const handleOpen = (expense: Expense) => {
    setSelected(expense);
    setDrawerOpen(true);
  };

  return (
    <>
      <header className="rounded-b-sheet bg-main px-5 pb-5 pt-[max(env(safe-area-inset-top),16px)] text-main-ink">
        <p className="pt-9 text-[13px] text-main-muted">Spent in {trip.name}</p>
        <h1 className="mt-0.5 text-[38px] font-bold leading-[1.1] tracking-[-0.03em]">
          {formatMoney(data?.total ?? 0, trip.currency)}
        </h1>
        {chronological.length > 0 && (
          <ul className="mt-3.5 flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="Total per day">
            {chronological.map((d) => (
              <li key={d.date} className="min-w-[84px] flex-1 rounded-tile bg-main-2 px-3 py-2.5">
                <span className="block text-xs text-main-muted">{formatShortDate(d.date)}</span>
                <span className="font-semibold">{formatMoneyShort(d.total, trip.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-label="Expenses" className="px-5 pb-[120px] pt-1.5">
        {expenses.isPending ? (
          <p className="py-6 text-center text-muted-foreground">Loading spending…</p>
        ) : expenses.isError ? (
          <p className="py-6 text-center text-danger">Couldn't load spending. {expenses.error.message}</p>
        ) : !data?.items.length ? (
          <p className="py-6 text-center text-muted-foreground">Nothing spent yet. Add the first one below.</p>
        ) : (
          data.days.map((day) => (
            <div key={day.date}>
              <h2 className="mb-1 mt-4 flex justify-between text-[13px] font-medium text-muted-foreground">
                <span>{formatDay(day.date)}</span>
                <span>{formatMoney(day.total, trip.currency)}</span>
              </h2>
              <ul>
                {(byDay.get(day.date) ?? []).map((e) => (
                  <li key={e.id} className={cn("border-b border-line", e.id === fresh && "animate-flash")}>
                    <button type="button" onClick={() => handleOpen(e)} className="flex w-full items-center gap-2.5 py-[11px] text-left">
                      <span className="min-w-0 flex-1 truncate">{e.name}</span>
                      {e.placeId !== null && (
                        <MapPin className="size-[15px] shrink-0 text-brand-deep" aria-label="Saved place" />
                      )}
                      <span className="font-medium">{formatMoney(e.amount, trip.currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <QuickEntry tripId={trip.id} currency={trip.currency} onAdded={setFresh} />
      <ExpenseDrawer expense={selected} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
