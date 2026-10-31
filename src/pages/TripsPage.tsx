import { Check, ChevronLeft, Download, Map as MapIcon, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ImportButton } from "@/components/data/ImportButton";
import { FormHeader } from "@/components/layout/MainHeader";
import { TripForm, type TripFormValues } from "@/components/trips/TripForm";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { downloadExport } from "@/lib/download";
import { formatMoney, formatRange } from "@/lib/format";
import { PALETTES } from "@/lib/palettes";
import { useActiveTrip, useCreateTrip, useSetActiveTrip, useTrips } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { TripSummary } from "../../shared/schemas.ts";

function TripRow({ trip, active, onOpen }: { trip: TripSummary; active: boolean; onOpen: (id: number) => void }) {
  const color = PALETTES.find((p) => p.key === trip.theme)?.main;
  const meta = [
    formatRange(trip.startDate, trip.endDate) ?? "No stays yet",
    `${trip.placeCount} ${trip.placeCount === 1 ? "place" : "places"}`,
    trip.spent ? formatMoney(trip.spent, trip.currency) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const Icon = active ? Check : MapIcon;
  return (
    <li className="flex items-center gap-3 border-b border-line py-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-[14px] text-white" style={{ background: color }} aria-hidden>
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{trip.name}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{meta}</span>
      </span>
      {!active && (
        <Button size="sm" variant="secondary" onClick={() => onOpen(trip.id)}>
          Open
        </Button>
      )}
    </li>
  );
}

export function TripsPage() {
  const trips = useTrips();
  const active = useActiveTrip();
  const setActive = useSetActiveTrip();
  const createTrip = useCreateTrip();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const activeId = active.data?.id ?? null;
  const others = (trips.data ?? []).filter((t) => t.id !== activeId);

  const handleOpen = async (tripId: number) => {
    try {
      await setActive.mutateAsync(tripId);
      navigate("/places");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open the trip");
    }
  };

  const handleCreate = async (values: TripFormValues) => {
    try {
      const trip = await createTrip.mutateAsync(values);
      await setActive.mutateAsync(trip.id);
      setCreating(false);
      navigate("/places");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the trip");
    }
  };

  const handleExportAll = async () => {
    try {
      await downloadExport("/api/export");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  return (
    <>
      <FormHeader
        title="Trips"
        leading={
          activeId !== null ? (
            <Button asChild variant="ghost" size="icon" aria-label="Back to places">
              <Link to="/places">
                <ChevronLeft />
              </Link>
            </Button>
          ) : (
            <span />
          )
        }
        trailing={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New
          </Button>
        }
      />

      {trips.isPending ? (
        <p className="py-6 text-center text-muted-foreground">Loading trips…</p>
      ) : (
        <>
          {active.data && (
            <section className="px-4">
              <h2 className="mb-1 mt-5 text-[13px] font-semibold text-muted-foreground">Active</h2>
              <ul>
                <TripRow trip={active.data} active onOpen={handleOpen} />
              </ul>
            </section>
          )}
          {others.length > 0 && (
            <section className="px-4">
              <h2 className="mb-1 mt-5 text-[13px] font-semibold text-muted-foreground">
                {active.data ? "Other trips" : "Pick a trip"}
              </h2>
              <ul>
                {others.map((t) => (
                  <TripRow key={t.id} trip={t} active={false} onOpen={handleOpen} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="px-4 pb-10">
        <h2 className="mb-1 mt-5 text-[13px] font-semibold text-muted-foreground">All data</h2>
        <div className="overflow-hidden rounded-card bg-sunken [&>*+*]:border-t [&>*+*]:border-background">
          <Button variant="ghost" className={cn("h-12 w-full justify-start rounded-none px-3.5")} onClick={handleExportAll}>
            <Download aria-hidden />
            <span className="flex-1 text-left">Export all trips</span>
            <span className="text-muted-foreground">JSON</span>
          </Button>
          <ImportButton variant="ghost" className="h-12 w-full justify-start rounded-none px-3.5" />
        </div>
      </section>

      <Drawer open={creating} onOpenChange={setCreating}>
        <DrawerContent>
          <div className="overflow-y-auto px-[18px] pb-[max(env(safe-area-inset-bottom),22px)] pt-3">
            <DrawerTitle className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">New trip</DrawerTitle>
            <DrawerDescription className="sr-only">Name, currency, and palette</DrawerDescription>
            <TripForm submitLabel="Create trip" pending={createTrip.isPending} onSubmit={handleCreate} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
