import { createContext, useContext } from "react";
import { Navigate, Outlet } from "react-router";
import { useActiveTrip, useSession, useTrips } from "@/lib/queries";
import type { TripSummary } from "../../../shared/schemas.ts";
import { useTripTheme } from "../theme/use-trip-theme.ts";
import { BottomNav } from "./BottomNav.tsx";
import { FullScreenMessage } from "./FullScreenMessage.tsx";

const TripContext = createContext<TripSummary | null>(null);

/** The active trip. Only valid inside `AppShell`. */
export function useTrip(): TripSummary {
  const trip = useContext(TripContext);
  if (!trip) throw new Error("useTrip must be used inside AppShell");
  return trip;
}

/** Sends visitors without a session to the login screen. */
export function RequireAuth() {
  const session = useSession();
  if (session.isPending) return <FullScreenMessage title="Loading…" />;
  if (session.isError) return <FullScreenMessage title="Can't reach the server" detail={session.error.message} />;
  if (!session.data.authenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Layout for trip screens: applies the trip palette and, unless `withNav` is false, shows the bottom navigation. */
export function AppShell({ withNav = true }: { withNav?: boolean }) {
  const active = useActiveTrip();
  const trips = useTrips();
  useTripTheme(active.data?.theme);

  if (active.isPending || trips.isPending) return <FullScreenMessage title="Loading…" />;
  if (active.isError) return <FullScreenMessage title="Can't load the trip" detail={active.error.message} />;
  if (!active.data) return <Navigate to={trips.data?.length ? "/trips" : "/welcome"} replace />;

  return (
    <TripContext.Provider value={active.data}>
      <div className={withNav ? "mx-auto min-h-dvh max-w-[480px] pb-[calc(env(safe-area-inset-bottom)+104px)]" : "mx-auto min-h-dvh max-w-[480px]"}>
        <Outlet />
      </div>
      {withNav && <BottomNav />}
    </TripContext.Provider>
  );
}

/** Layout for screens outside a trip (trips, categories, first run), on the active palette. */
export function PlainShell() {
  const active = useActiveTrip();
  useTripTheme(active.data?.theme);
  return (
    <div className="mx-auto min-h-dvh max-w-[480px]">
      <Outlet />
    </div>
  );
}
