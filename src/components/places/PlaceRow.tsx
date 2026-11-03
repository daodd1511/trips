import { Check, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryIcon } from "@/lib/category-icons";
import { directionsUrl } from "@/lib/directions";
import { cn } from "@/lib/utils";
import type { CategoryView, PlaceView } from "../../../shared/schemas.ts";

type PlaceRowProps = {
  place: PlaceView;
  categories: ReadonlyMap<number, CategoryView>;
  onOpen: (placeId: number) => void;
};

/** One place in the trip list: opens the detail drawer, with a directions shortcut. */
export function PlaceRow({ place, categories, onOpen }: PlaceRowProps) {
  const names = place.categoryIds.map((id) => categories.get(id)?.name).filter((n): n is string => !!n);
  const Icon = place.status === "visited" ? Check : categoryIcon(names[0] ?? "other");
  const subline = [...names, place.address, place.notes].filter(Boolean).join(" · ");
  const directions = directionsUrl(place);

  return (
    <li className="flex items-center gap-1 border-b border-line">
      <button
        type="button"
        onClick={() => onOpen(place.id)}
        className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[14px] bg-sunken text-main",
            place.status === "visited" && "bg-main text-main-ink",
          )}
          aria-hidden
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{place.name}</span>
          {subline && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{subline}</span>}
        </span>
        {place.rating !== null && (
          <span className="text-sm font-semibold text-brand-deep">
            {place.rating}
            <span className="sr-only"> out of 10</span>
            <span aria-hidden>/10</span>
          </span>
        )}
      </button>
      {directions ? (
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Directions to ${place.name}`}>
          <a href={directions} target="_blank" rel="noreferrer">
            <Navigation strokeWidth={1.75} />
          </a>
        </Button>
      ) : (
        <span className="size-9 shrink-0" aria-hidden />
      )}
    </li>
  );
}
