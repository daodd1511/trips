import { Navigation, Pencil, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { useTrip } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/MainHeader";
import { StayDrawer } from "@/components/stays/StayDrawer";
import { Button } from "@/components/ui/button";
import { formatShortDate, localToday, nightsBetween } from "@/lib/format";
import { useStays } from "@/lib/queries";
import { currentStay } from "@/lib/stays";
import { cn } from "@/lib/utils";
import { findPhoneNumber } from "../../shared/phone.ts";
import type { Stay } from "../../shared/schemas.ts";

function stayDates(stay: Stay): string {
  if (!stay.checkIn && !stay.checkOut) return "No dates";
  if (stay.checkIn && stay.checkOut) {
    const nights = nightsBetween(stay.checkIn, stay.checkOut);
    return `${formatShortDate(stay.checkIn)} → ${formatShortDate(stay.checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`;
  }
  return stay.checkIn ? `From ${formatShortDate(stay.checkIn)}` : `Until ${formatShortDate(stay.checkOut ?? "")}`;
}

function StayCard({ stay, now, onEdit }: { stay: Stay; now: boolean; onEdit: (stay: Stay) => void }) {
  const phone = stay.notes ? findPhoneNumber(stay.notes) : null;
  const actionClass = now ? "bg-main-ink text-main hover:bg-main-ink" : "bg-background";
  return (
    <article className={cn("mx-4 mb-2.5 rounded-card bg-sunken p-3.5", now && "bg-main text-main-ink")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold">{stay.name}</h2>
          <p className={cn("text-[13px] text-muted-foreground", now && "text-main-muted")}>
            {now && "Now · "}
            {stayDates(stay)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${stay.name}`}
          className={cn(now && "text-main-ink hover:bg-main-2 hover:text-main-ink")}
          onClick={() => onEdit(stay)}
        >
          <Pencil strokeWidth={1.75} />
        </Button>
      </div>
      {stay.notes && (
        <p className={cn("mt-2.5 whitespace-pre-wrap rounded-tile bg-background px-3 py-2.5 text-sm", now && "bg-main-2 text-main-ink")}>
          {stay.notes}
        </p>
      )}
      {(stay.mapsUrl || phone) && (
        <div className="mt-2.5 flex gap-2">
          {stay.mapsUrl && (
            <Button asChild size="sm" variant="secondary" className={actionClass}>
              <a href={stay.mapsUrl} target="_blank" rel="noreferrer">
                <Navigation aria-hidden />
                Directions
              </a>
            </Button>
          )}
          {phone && (
            <Button asChild size="sm" variant="secondary" className={actionClass}>
              <a href={`tel:${phone}`}>
                <Phone aria-hidden />
                Call host
              </a>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export function StaysPage() {
  const trip = useTrip();
  const stays = useStays(trip.id);
  const [editing, setEditing] = useState<Stay | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const list = stays.data ?? [];
  const now = currentStay(list, localToday());
  const ordered = now ? [now, ...list.filter((s) => s.id !== now.id)] : list;
  const nights = list.reduce((sum, s) => sum + (s.checkIn && s.checkOut ? nightsBetween(s.checkIn, s.checkOut) : 0), 0);

  const openDrawer = (stay: Stay | null) => {
    setEditing(stay);
    setDrawerOpen(true);
  };

  return (
    <>
      <MainHeader
        title="Stays"
        subtitle={`${trip.name} · ${list.length} ${list.length === 1 ? "stay" : "stays"}${nights ? ` · ${nights} nights` : ""}`}
        action={
          <Button variant="onMain" size="sm" onClick={() => openDrawer(null)}>
            <Plus aria-hidden />
            Stay
          </Button>
        }
      />
      <div className="pt-4">
        {stays.isPending ? (
          <p className="py-6 text-center text-muted-foreground">Loading stays…</p>
        ) : stays.isError ? (
          <p className="py-6 text-center text-danger">Couldn't load stays. {stays.error.message}</p>
        ) : ordered.length ? (
          ordered.map((s) => <StayCard key={s.id} stay={s} now={s.id === now?.id} onEdit={openDrawer} />)
        ) : (
          <p className="px-6 py-6 text-center text-muted-foreground">
            No stays yet. Add where you sleep, with the booking code and the host's number.
          </p>
        )}
      </div>
      <StayDrawer tripId={trip.id} stay={editing} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
