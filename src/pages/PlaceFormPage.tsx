import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, TriangleAlert } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { useTrip } from "@/components/layout/AppShell";
import { Field, FieldStack } from "@/components/form/Field";
import { FormHeader } from "@/components/layout/MainHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryIcon } from "@/lib/category-icons";
import { useCategories, useCreatePlace, useDeletePlace, usePlaces, useUpdatePlace } from "@/lib/queries";
import { ADDRESS_MAX, NOTES_MAX, type PlaceView } from "../../shared/schemas.ts";

const optionalUrl = z.union([z.literal(""), z.url("Paste a full link, starting with https://")]);

const schema = z.object({
  name: z.string().trim().min(1, "Give the place a name").max(200),
  address: z.string().max(ADDRESS_MAX, `Keep the address under ${ADDRESS_MAX} characters`),
  mapsUrl: optionalUrl,
  sourceUrl: optionalUrl,
  notes: z.string().max(NOTES_MAX, `Keep notes under ${NOTES_MAX} characters`),
  categoryIds: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

const toValues = (p: PlaceView | undefined): Values => ({
  name: p?.name ?? "",
  address: p?.address ?? "",
  mapsUrl: p?.mapsUrl ?? "",
  sourceUrl: p?.sourceUrl ?? "",
  notes: p?.notes ?? "",
  categoryIds: (p?.categoryIds ?? []).map(String),
});

const toInput = (v: Values) => ({
  name: v.name.trim(),
  address: v.address.trim() || null,
  mapsUrl: v.mapsUrl.trim() || null,
  sourceUrl: v.sourceUrl.trim() || null,
  notes: v.notes.trim() || null,
  categoryIds: v.categoryIds.map(Number),
});

/** Create or edit a place. `/places/new` creates; `/places/:id/edit` edits. */
export function PlaceFormPage() {
  const trip = useTrip();
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const places = usePlaces(trip.id);
  const existing = places.data?.find((p) => p.id === editingId);

  if (editingId !== null && places.isPending) return <FormHeader title="Edit place" leading={<BackLink />} />;
  if (editingId !== null && !existing) {
    return (
      <>
        <FormHeader title="Edit place" leading={<BackLink />} />
        <p className="p-6 text-center text-muted-foreground">This place no longer exists.</p>
      </>
    );
  }
  return <PlaceForm key={existing?.id ?? "new"} tripId={trip.id} place={existing} siblings={places.data ?? []} />;
}

function BackLink() {
  return (
    <Button asChild variant="ghost">
      <Link to="/places">Cancel</Link>
    </Button>
  );
}

type PlaceFormProps = { tripId: number; place: PlaceView | undefined; siblings: readonly PlaceView[] };

function PlaceForm({ tripId, place, siblings }: PlaceFormProps) {
  const navigate = useNavigate();
  const categories = useCategories(tripId);
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(place) });
  const errors = form.formState.errors;

  const mapsUrl = useWatch({ control: form.control, name: "mapsUrl" }).trim();
  const duplicate = mapsUrl ? siblings.find((p) => p.mapsUrl === mapsUrl && p.id !== place?.id) : undefined;
  const pending = createPlace.isPending || updatePlace.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (place) {
        await updatePlace.mutateAsync({ placeId: place.id, patch: toInput(values) });
        toast.success("Place saved");
      } else {
        await createPlace.mutateAsync({ tripId, input: { ...toInput(values), status: "want", rating: null } });
        toast.success(`Added ${values.name.trim()}`);
      }
      navigate("/places");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the place");
    }
  });

  const handleDelete = async () => {
    if (!place) return;
    try {
      await deletePlace.mutateAsync(place.id);
      toast.success(`Deleted ${place.name}`);
      navigate("/places");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the place");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormHeader
        title={place ? "Edit place" : "New place"}
        leading={<BackLink />}
        trailing={
          <Button type="submit" size="sm" disabled={pending}>
            Save
          </Button>
        }
      />
      <FieldStack className="px-4 pb-12 pt-6">
        <Field label="Name" htmlFor="place-name" error={errors.name?.message}>
          <Input id="place-name" aria-invalid={!!errors.name} {...form.register("name")} />
        </Field>

        <Field
          label="Address"
          htmlFor="place-address"
          optional
          error={errors.address?.message}
          hint="For places that aren't on the map. Directions searches for it."
        >
          <Input
            id="place-address"
            autoComplete="off"
            placeholder="12 Phan Bội Châu, Đà Lạt"
            aria-invalid={!!errors.address}
            {...form.register("address")}
          />
        </Field>

        <Field label="Google Maps link" htmlFor="place-maps" optional error={errors.mapsUrl?.message}>
          <Input
            id="place-maps"
            inputMode="url"
            autoComplete="off"
            placeholder="https://maps.app.goo.gl/…"
            aria-invalid={!!errors.mapsUrl}
            {...form.register("mapsUrl")}
          />
          {duplicate && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <AlertDescription>“{duplicate.name}” has the same link. You can still save.</AlertDescription>
            </Alert>
          )}
        </Field>

        <Field label="TikTok or source link" htmlFor="place-source" optional error={errors.sourceUrl?.message}>
          <Input
            id="place-source"
            inputMode="url"
            autoComplete="off"
            placeholder="Paste a link"
            aria-invalid={!!errors.sourceUrl}
            {...form.register("sourceUrl")}
          />
        </Field>

        <Field label="Categories" hint="None picked means Other.">
          <Controller
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                value={field.value}
                onValueChange={field.onChange}
                aria-label="Categories"
                className="flex w-full flex-wrap justify-start gap-2"
              >
                {(categories.data ?? []).map((c) => {
                  const Icon = categoryIcon(c.name);
                  return (
                    <ToggleGroupItem key={c.id} value={String(c.id)} className="h-9 px-3.5">
                      <Icon className="size-[15px]" strokeWidth={1.75} aria-hidden />
                      {c.name}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            )}
          />
        </Field>

        <Field label="Notes" htmlFor="place-notes" optional error={errors.notes?.message}>
          <Textarea id="place-notes" placeholder="What to order, when to go" aria-invalid={!!errors.notes} {...form.register("notes")} />
        </Field>

        {place && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructiveGhost" className="justify-self-start">
                <Trash2 aria-hidden />
                Delete place
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{place.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Its expenses stay in Spending, without the link to this place.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </FieldStack>
    </form>
  );
}
