import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { ImportButton } from "@/components/data/ImportButton";
import { useTripTheme } from "@/components/theme/use-trip-theme";
import { TripForm, type TripFormValues } from "@/components/trips/TripForm";
import { useCreateTrip, useTrips } from "@/lib/queries";
import type { ThemeKey } from "../../shared/themes.ts";

/** First run: create the first trip, or import one. */
export function WelcomePage() {
  const [preview, setPreview] = useState<ThemeKey>("pine-berry");
  useTripTheme(preview);
  const trips = useTrips();
  const createTrip = useCreateTrip();
  const navigate = useNavigate();

  if (trips.data?.length) return <Navigate to="/" replace />;

  const handleCreate = async (values: TripFormValues) => {
    try {
      await createTrip.mutateAsync(values);
      navigate("/places", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the trip");
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-main text-main-ink">
      <div className="flex-1 px-6 pt-[max(env(safe-area-inset-top),24px)]">
        <h1 className="mt-20 text-[40px] font-bold leading-none tracking-[-0.04em]">No trips yet</h1>
        <p className="mt-3 max-w-[30ch] text-main-muted">
          Create your first trip. You can add places, stays, and spending after.
        </p>
      </div>
      <section className="grid gap-3 rounded-t-sheet bg-background px-5 pb-[max(env(safe-area-inset-bottom),32px)] pt-6 text-ink">
        <TripForm submitLabel="Create trip" pending={createTrip.isPending} onSubmit={handleCreate} onThemePreview={setPreview} />
        <ImportButton className="w-full" onImported={() => navigate("/places", { replace: true })} />
      </section>
    </main>
  );
}
