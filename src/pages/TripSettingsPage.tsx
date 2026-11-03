import { ArrowLeftRight, ChevronRight, Download, RefreshCw, Tags, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useTrip } from "@/components/layout/AppShell";
import { MainHeader } from "@/components/layout/MainHeader";
import { useTripTheme } from "@/components/theme/use-trip-theme";
import { TripForm, type TripFormValues } from "@/components/trips/TripForm";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadExport } from "@/lib/download";
import { useCategories, useDeleteTrip, useExpenses, useStays, useUpdateTrip } from "@/lib/queries";
import type { ThemeKey } from "../../shared/themes.ts";

function SettingLink({ to, icon, label, value }: { to: string; icon: ReactNode; label: string; value?: string }) {
  return (
    <Link to={to} className="flex h-12 items-center gap-3 px-3.5 text-ink">
      {icon}
      <span className="flex-1">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
    </Link>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function TripSettingsPage() {
  const trip = useTrip();
  const [preview, setPreview] = useState<ThemeKey>(trip.theme);
  useTripTheme(preview, trip.theme);
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();
  const categories = useCategories(trip.id);
  const stays = useStays(trip.id);
  const expenses = useExpenses(trip.id);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const locked = (expenses.data?.items.length ?? 0) > 0;

  const handleSave = async (values: TripFormValues) => {
    try {
      await updateTrip.mutateAsync({
        tripId: trip.id,
        patch: locked ? { name: values.name, theme: values.theme } : values,
      });
      toast.success("Trip saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the trip");
    }
  };

  const handleExport = async () => {
    try {
      await downloadExport(`/api/trips/${trip.id}/export`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast.success(`Deleted ${trip.name}`);
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the trip");
    }
  };

  return (
    <>
      <MainHeader title="Trip" subtitle={`Settings for ${trip.name}`} />
      <div className="px-4 pb-4 pt-[18px]">
        <TripForm
          key={`${trip.id}-${trip.name}-${trip.currency}-${trip.theme}`}
          defaultValues={{ name: trip.name, currency: trip.currency, theme: trip.theme }}
          submitLabel="Save"
          pending={updateTrip.isPending}
          currencyLockedReason={locked ? "Locked: this trip already has expenses." : undefined}
          onSubmit={handleSave}
          onThemePreview={setPreview}
        />
      </div>

      <div className="mx-4 mb-3.5 overflow-hidden rounded-card bg-sunken [&>*+*]:border-t [&>*+*]:border-background">
        <SettingLink
          to="/categories"
          icon={<Tags className="size-[18px] text-muted-foreground" aria-hidden />}
          label="Categories"
          value={String(categories.data?.length ?? "")}
        />
        <SettingLink to="/trips" icon={<ArrowLeftRight className="size-[18px] text-muted-foreground" aria-hidden />} label="Switch trip" />
        <Button variant="ghost" className="h-12 w-full justify-start rounded-none px-3.5 font-normal" onClick={handleExport}>
          <Download className="text-muted-foreground" aria-hidden />
          <span className="flex-1 text-left">Export this trip</span>
          <span className="text-muted-foreground">JSON</span>
        </Button>
        <Button
          variant="ghost"
          className="h-12 w-full justify-start rounded-none px-3.5 font-normal"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="text-muted-foreground" aria-hidden />
          <span className="flex-1 text-left">Reload app</span>
          <span className="text-muted-foreground">Gets the latest version</span>
        </Button>
      </div>

      <div className="mx-4 overflow-hidden rounded-card bg-sunken">
        <AlertDialog onOpenChange={() => setConfirm("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructiveGhost" className="h-12 w-full justify-start rounded-none px-3.5 font-normal">
              <Trash2 aria-hidden />
              Delete trip
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {trip.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes {plural(trip.placeCount, "place")}, {plural(stays.data?.length ?? 0, "stay")}, and{" "}
                {plural(expenses.data?.items.length ?? 0, "expense")}. You can't undo it. Export the trip first if
                you want a copy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download aria-hidden />
              Export this trip
            </Button>
            <div className="grid gap-2">
              <Label htmlFor="confirm-name">
                <span>
                  Type <b>{trip.name}</b> to confirm
                </span>
              </Label>
              <Input id="confirm-name" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </div>
            <AlertDialogFooter className="grid grid-cols-2 gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={confirm.trim() !== trip.name || deleteTrip.isPending}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
