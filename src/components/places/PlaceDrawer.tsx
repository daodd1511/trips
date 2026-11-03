import { Clapperboard, MapPin, Navigation, Pencil } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { directionsUrl } from "@/lib/directions";
import { formatMoney, localToday } from "@/lib/format";
import { useAddPlaceExpense, useSetPlaceStatus, useUpdatePlace } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PLACE_STATUSES, type CategoryView, type PlaceStatus, type PlaceView } from "../../../shared/schemas.ts";
import { PriceField } from "./PriceField.tsx";

const STATUS_LABEL: Record<PlaceStatus, string> = { want: "Want", visited: "Visited", skipped: "Skipped" };
const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type PlaceDrawerProps = {
  /** Kept set while the drawer animates closed, so its content does not vanish. */
  place: PlaceView | null;
  open: boolean;
  categories: ReadonlyMap<number, CategoryView>;
  currency: string;
  onClose: () => void;
};

/** Place detail: links, status, rating, notes, and spending at the place. */
export function PlaceDrawer({ place, open, categories, currency, onClose }: PlaceDrawerProps) {
  const setStatus = useSetPlaceStatus();
  const updatePlace = useUpdatePlace();
  const addExpense = useAddPlaceExpense();

  const handleStatus = (value: string) => {
    const status = PLACE_STATUSES.find((s) => s === value);
    if (!place || !status || status === place.status) return;
    setStatus.mutate({ placeId: place.id, status }, { onError: (e) => toast.error(e.message) });
  };

  const handleRating = (value: string) => {
    if (!place) return;
    const rating = value ? Number(value) : null;
    updatePlace.mutate({ placeId: place.id, patch: { rating } }, { onError: (e) => toast.error(e.message) });
  };

  const handleAddExpense = async (price: string) => {
    if (!place) return;
    try {
      const { expense, place: after } = await addExpense.mutateAsync({ placeId: place.id, price, spentOn: localToday() });
      const visited = place.status === "want" && after.status === "visited";
      toast.success(`Added ${formatMoney(expense.amount, currency)}${visited ? " · marked visited" : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the expense");
    }
  };

  return (
    <Drawer open={open && place !== null} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent>
        {place && (
          <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),28px)] pt-3">
            <div className="flex items-start justify-between gap-2">
              <DrawerTitle className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{place.name}</DrawerTitle>
              <Button asChild variant="ghost" size="icon-sm" aria-label="Edit place">
                <Link to={`/places/${place.id}/edit`}>
                  <Pencil strokeWidth={1.75} />
                </Link>
              </Button>
            </div>
            <DrawerDescription className="sr-only">Details, status, rating, and spending</DrawerDescription>
            {place.address && (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {place.address}
              </p>
            )}
            <div className="mb-5 mt-3 flex flex-wrap gap-1.5">
              {place.categoryIds.map((id) => (
                <Badge key={id} variant="secondary">
                  {categories.get(id)?.name}
                </Badge>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2">
              {directionsUrl(place) ? (
                <Button asChild>
                  <a href={directionsUrl(place) ?? undefined} target="_blank" rel="noreferrer">
                    <Navigation aria-hidden />
                    Directions
                  </a>
                </Button>
              ) : (
                <Button disabled>
                  <Navigation aria-hidden />
                  No location
                </Button>
              )}
              {place.sourceUrl ? (
                <Button asChild variant="secondary">
                  <a href={place.sourceUrl} target="_blank" rel="noreferrer">
                    <Clapperboard aria-hidden />
                    TikTok
                  </a>
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  <Clapperboard aria-hidden />
                  No source
                </Button>
              )}
            </div>

            <section className="mb-6">
              <h3 className="mb-2.5 text-[13px] text-muted-foreground">Status</h3>
              <ToggleGroup type="single" value={place.status} onValueChange={handleStatus} className="grid w-full grid-cols-3 gap-1.5">
                {PLACE_STATUSES.map((s) => (
                  <ToggleGroupItem key={s} value={s} className="h-10">
                    {STATUS_LABEL[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>

            <section className="mb-6">
              <h3 className="mb-2.5 text-[13px] text-muted-foreground">Your rating</h3>
              {place.status === "visited" ? (
                <ToggleGroup
                  type="single"
                  value={place.rating === null ? "" : String(place.rating)}
                  onValueChange={handleRating}
                  aria-label="Rating from 1 to 10"
                  className="flex w-full justify-between gap-0"
                >
                  {RATINGS.map((n) => (
                    <ToggleGroupItem
                      key={n}
                      value={String(n)}
                      className={cn(
                        "size-[30px] min-w-0 rounded-full p-0 text-xs text-muted-foreground data-[state=on]:bg-brand data-[state=on]:text-brand-ink",
                        place.rating !== null && n < place.rating && "bg-brand-soft text-brand-deep",
                      )}
                    >
                      {n}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : (
                <p className="text-sm text-muted-foreground">Mark it visited to rate it.</p>
              )}
            </section>

            {place.notes && (
              <section className="mb-6">
                <h3 className="mb-1.5 text-[13px] text-muted-foreground">Notes</h3>
                <p className="whitespace-pre-wrap">{place.notes}</p>
              </section>
            )}

            <section>
              <h3 className="mb-2.5 text-[13px] text-muted-foreground">
                Spent here{place.spent > 0 && ` · ${formatMoney(place.spent, currency)} so far`}
              </h3>
              <PriceField currency={currency} pending={addExpense.isPending} onAdd={handleAddExpense} />
            </section>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
