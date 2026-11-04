import { ArrowLeftRight, BedDouble, Navigation, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTrip } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/MainHeader";
import { PlaceDrawer } from "@/components/places/PlaceDrawer";
import { PlaceRow } from "@/components/places/PlaceRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryIcon, categoryShortName } from "@/lib/category-icons";
import { formatRange, formatShortDate, localToday } from "@/lib/format";
import { useCategories, usePlaces, useStays } from "@/lib/queries";
import { currentStay } from "@/lib/stays";
import { PLACE_STATUSES, type PlaceStatus, type PlaceView } from "../../shared/schemas.ts";
import { searchKey } from "../../shared/search.ts";

const STATUS_LABEL: Record<PlaceStatus, string> = { want: "To go", visited: "Visited", skipped: "Skipped" };

function readFilters(params: URLSearchParams) {
  const status = PLACE_STATUSES.find((s) => s === params.get("status")) ?? "want";
  const cats = (params.get("cats") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0);
  return { status, cats, q: params.get("q") ?? "" };
}

function matches(place: PlaceView, cats: number[], q: string): boolean {
  if (cats.length && !place.categoryIds.some((id) => cats.includes(id))) return false;
  return !q || searchKey([place.name, place.address, place.notes].filter(Boolean).join("\n")).includes(searchKey(q.trim()));
}

export function PlacesPage() {
  const trip = useTrip();
  const places = usePlaces(trip.id);
  const categories = useCategories(trip.id);
  const stays = useStays(trip.id);
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { status, cats, q } = readFilters(params);
  const all = places.data ?? [];
  const categoryMap = new Map((categories.data ?? []).map((c) => [c.id, c]));
  const filtered = all.filter((p) => matches(p, cats, q));
  const visible = filtered.filter((p) => p.status === status);
  const stay = currentStay(stays.data ?? [], localToday());
  const range = formatRange(trip.startDate, trip.endDate);

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const handleOpen = (placeId: number) => {
    setSelectedId(placeId);
    setDrawerOpen(true);
  };

  const emptyMessage = !all.length
    ? "No places yet. Tap + to add the first one."
    : `No ${STATUS_LABEL[status].toLowerCase()} places match.`;

  return (
    <>
      <MainHeader
        title={trip.name}
        subtitle={`${range ?? "No dates yet"} · ${trip.wantCount} ${trip.wantCount === 1 ? "place" : "places"} to go`}
        action={
          <Button asChild variant="onMain" size="icon-sm" aria-label="Switch trip">
            <Link to="/trips">
              <ArrowLeftRight strokeWidth={1.75} />
            </Link>
          </Button>
        }
      >
        {stay && (
          <div className="mt-4 flex items-center gap-3 rounded-card bg-main-2 py-2.5 pl-3.5 pr-2.5">
            <BedDouble className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{stay.name}</p>
              <p className="truncate text-xs text-main-muted">
                {stay.checkOut ? `Until ${formatShortDate(stay.checkOut)}` : "No dates"}
                {stay.notes && ` · ${stay.notes}`}
              </p>
            </div>
            {stay.mapsUrl && (
              <Button asChild size="sm" className="bg-main-ink text-main hover:bg-main-ink">
                <a href={stay.mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation aria-hidden />
                  Go
                </a>
              </Button>
            )}
          </div>
        )}
      </MainHeader>

      <ToggleGroup
        type="multiple"
        value={cats.map(String)}
        onValueChange={(values) => setParam("cats", values.join(","))}
        aria-label="Filter by category"
        className="grid w-full grid-cols-5 gap-2 px-5 pb-1.5 pt-4"
      >
        {(categories.data ?? []).map((c) => {
          const Icon = categoryIcon(c.name);
          return (
            <ToggleGroupItem
              key={c.id}
              value={String(c.id)}
              className="h-auto flex-col gap-1 rounded-tile px-0.5 pb-2 pt-2.5 text-[11px] data-[state=on]:text-main-ink"
            >
              <Icon className="size-5 text-main group-data-[state=on]/toggle:text-main-muted" strokeWidth={1.75} aria-hidden />
              <span className="max-w-full truncate">{categoryShortName(c.name)}</span>
              <span className="text-[10px] text-muted-foreground group-data-[state=on]/toggle:text-main-muted">
                {c.placeCount}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <div className="relative px-5 pt-2.5">
        <Search className="pointer-events-none absolute left-[34px] top-[23px] size-[18px] text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Search places, addresses, notes"
          aria-label="Search places, addresses, and notes"
          className="pl-11"
        />
      </div>

      <ToggleGroup
        type="single"
        value={status}
        onValueChange={(value) => value && setParam("status", value === "want" ? "" : value)}
        aria-label="Status"
        className="grid w-full grid-cols-3 gap-1.5 px-5 pb-1.5 pt-2.5"
      >
        {PLACE_STATUSES.map((s) => (
          <ToggleGroupItem key={s} value={s} className="h-9">
            {STATUS_LABEL[s]}
            <span className="font-normal opacity-70">{filtered.filter((p) => p.status === s).length}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <section aria-label="Places" className="px-5">
        {places.isPending ? (
          <p className="py-6 text-center text-muted-foreground">Loading places…</p>
        ) : places.isError ? (
          <p className="py-6 text-center text-danger">Couldn't load places. {places.error.message}</p>
        ) : visible.length ? (
          <ul>
            {visible.map((p) => (
              <PlaceRow key={p.id} place={p} categories={categoryMap} onOpen={handleOpen} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-muted-foreground">{emptyMessage}</p>
        )}
      </section>

      <PlaceDrawer
        place={all.find((p) => p.id === selectedId) ?? null}
        open={drawerOpen}
        categories={categoryMap}
        currency={trip.currency}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
