import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStay, useDeleteStay, useUpdateStay } from "@/lib/queries";
import { NOTES_MAX, type Stay } from "../../../shared/schemas.ts";

const optionalDate = z.union([z.literal(""), z.iso.date()]);
const schema = z
  .object({
    name: z.string().trim().min(1, "Give the stay a name").max(200),
    mapsUrl: z.union([z.literal(""), z.url("Paste a full link, starting with https://")]),
    checkIn: optionalDate,
    checkOut: optionalDate,
    notes: z.string().max(NOTES_MAX),
  })
  .refine((s) => !s.checkIn || !s.checkOut || s.checkOut >= s.checkIn, {
    message: "Check-out must be on or after check-in",
    path: ["checkOut"],
  });
type Values = z.infer<typeof schema>;

const toInput = (v: Values) => ({
  name: v.name.trim(),
  mapsUrl: v.mapsUrl.trim() || null,
  checkIn: v.checkIn || null,
  checkOut: v.checkOut || null,
  notes: v.notes.trim() || null,
});

type StayDrawerProps = {
  tripId: number;
  /** The stay to edit; null adds a new one. */
  stay: Stay | null;
  open: boolean;
  onClose: () => void;
};

/** Add, edit, or delete a stay. */
export function StayDrawer({ tripId, stay, open, onClose }: StayDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent>
        <StayForm key={stay?.id ?? "new"} tripId={tripId} stay={stay} onDone={onClose} />
      </DrawerContent>
    </Drawer>
  );
}

function StayForm({ tripId, stay, onDone }: { tripId: number; stay: Stay | null; onDone: () => void }) {
  const createStay = useCreateStay();
  const updateStay = useUpdateStay();
  const deleteStay = useDeleteStay();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stay?.name ?? "",
      mapsUrl: stay?.mapsUrl ?? "",
      checkIn: stay?.checkIn ?? "",
      checkOut: stay?.checkOut ?? "",
      notes: stay?.notes ?? "",
    },
  });
  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (stay) await updateStay.mutateAsync({ stayId: stay.id, patch: toInput(values) });
      else await createStay.mutateAsync({ tripId, input: toInput(values) });
      toast.success(stay ? "Stay saved" : `Added ${values.name.trim()}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the stay");
    }
  });

  const handleDelete = async () => {
    if (!stay) return;
    try {
      await deleteStay.mutateAsync(stay.id);
      toast.success(`Deleted ${stay.name}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the stay");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-6 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),28px)] pt-3"
    >
      <DrawerTitle className="text-[22px] font-semibold tracking-[-0.02em]">{stay ? "Edit stay" : "New stay"}</DrawerTitle>
      <DrawerDescription className="sr-only">Where you stay, dates, and booking notes</DrawerDescription>
      <Field label="Name" htmlFor="stay-name" error={errors.name?.message}>
        <Input id="stay-name" aria-invalid={!!errors.name} {...form.register("name")} />
      </Field>
      <Field label="Google Maps link" htmlFor="stay-maps" optional error={errors.mapsUrl?.message}>
        <Input id="stay-maps" inputMode="url" autoComplete="off" aria-invalid={!!errors.mapsUrl} {...form.register("mapsUrl")} />
      </Field>
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in" htmlFor="stay-in" optional>
            <Input id="stay-in" type="date" {...form.register("checkIn", { deps: ["checkOut"] })} />
          </Field>
          <Field label="Check-out" htmlFor="stay-out" optional>
            <Input id="stay-out" type="date" aria-invalid={!!errors.checkOut} {...form.register("checkOut")} />
          </Field>
        </div>
        {errors.checkOut && (
          <p className="pl-1 text-xs text-danger" role="alert">
            {errors.checkOut.message}
          </p>
        )}
      </div>
      <Field label="Notes" htmlFor="stay-notes" optional>
        <Textarea
          id="stay-notes"
          placeholder="Booking code, door code, host phone like 0358937727"
          {...form.register("notes")}
        />
      </Field>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {stay ? (
          <Button type="button" variant="destructiveGhost" onClick={handleDelete} disabled={deleteStay.isPending}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={createStay.isPending || updateStay.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
