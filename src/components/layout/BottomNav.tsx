import { BedDouble, MapPin, Plus, Settings2, Wallet } from "lucide-react";
import { Link, NavLink } from "react-router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/places", label: "Places", Icon: MapPin },
  { to: "/stays", label: "Stays", Icon: BedDouble },
  { to: "/spending", label: "Spending", Icon: Wallet },
  { to: "/trip", label: "Trip", Icon: Settings2 },
] as const;

function NavItem({ to, label, Icon }: (typeof ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/places"}
      className={({ isActive }) =>
        cn(
          "flex w-16 flex-col items-center gap-0.5 text-[10px] font-medium text-main-muted",
          isActive && "text-main-ink",
        )
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {label}
    </NavLink>
  );
}

/** Floating main-colored navigation with a central add-place button. */
export function BottomNav() {
  const [places, stays, spending, trip] = ITEMS;
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-5 bottom-[max(env(safe-area-inset-bottom),16px)] z-40 mx-auto flex h-16 max-w-[448px] items-center justify-around rounded-full bg-main px-2 shadow-[0_12px_28px_-10px_rgb(16_32_25/0.55)]"
    >
      <NavItem {...places} />
      <NavItem {...stays} />
      <Link
        to="/places/new"
        aria-label="Add place"
        className="grid size-12 place-items-center rounded-full bg-brand text-brand-ink"
      >
        <Plus className="size-[22px]" aria-hidden />
      </Link>
      <NavItem {...spending} />
      <NavItem {...trip} />
    </nav>
  );
}
