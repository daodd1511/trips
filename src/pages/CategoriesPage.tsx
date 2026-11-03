import { ChevronLeft, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Field } from "@/components/form/Field";
import { FormHeader } from "@/components/layout/MainHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { categoryIcon } from "@/lib/category-icons";
import { useActiveTrip, useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from "@/lib/queries";
import type { CategoryView } from "../../shared/schemas.ts";

type Editing = { mode: "new" } | { mode: "rename"; category: CategoryView };

function NameForm({ editing, onDone }: { editing: Editing; onDone: () => void }) {
  const [name, setName] = useState(editing.mode === "rename" ? editing.category.name : "");
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const pending = createCategory.isPending || renameCategory.isPending;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing.mode === "rename") await renameCategory.mutateAsync({ categoryId: editing.category.id, name: trimmed });
      else await createCategory.mutateAsync({ name: trimmed });
      toast.success(editing.mode === "rename" ? "Category renamed" : `Added ${trimmed}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the category");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 px-5 pb-[max(env(safe-area-inset-bottom),28px)] pt-3">
      <DrawerTitle className="text-[22px] font-semibold tracking-[-0.02em]">
        {editing.mode === "rename" ? "Rename category" : "New category"}
      </DrawerTitle>
      <DrawerDescription className="sr-only">Category name, shared by all trips</DrawerDescription>
      <Field label="Name" htmlFor="category-name" hint="Shared by all trips.">
        <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" />
      </Field>
      <Button type="submit" disabled={!name.trim() || pending}>
        Save
      </Button>
    </form>
  );
}

export function CategoriesPage() {
  const active = useActiveTrip();
  const trip = active.data ?? null;
  const categories = useCategories(trip?.id ?? null);
  const deleteCategory = useDeleteCategory();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryView | null>(null);

  const openDrawer = (next: Editing) => {
    setEditing(next);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const result = await deleteCategory.mutateAsync(deleting.id);
      const moved = result.movedToOther ? ` ${result.movedToOther} moved to Other.` : "";
      toast.success(`Deleted ${deleting.name}.${moved}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the category");
    }
  };

  const countLabel = (c: CategoryView) =>
    c.isSystem
      ? "Built in · places you're unsure about"
      : `${c.placeCount} ${c.placeCount === 1 ? "place" : "places"}${trip ? ` in ${trip.name}` : ""}`;

  return (
    <>
      <FormHeader
        title="Categories"
        leading={
          <Button asChild variant="ghost" size="icon" aria-label="Back to trip settings">
            <Link to="/trip">
              <ChevronLeft />
            </Link>
          </Button>
        }
        trailing={
          <Button size="sm" onClick={() => openDrawer({ mode: "new" })}>
            <Plus aria-hidden />
            New
          </Button>
        }
      />
      <p className="mx-4 mb-1 mt-5 text-[13px] font-semibold text-muted-foreground">Shared by all trips</p>
      <ul className="px-4 pb-10">
        {(categories.data ?? []).map((c) => {
          const Icon = categoryIcon(c.name);
          return (
            <li key={c.id} className="flex items-center gap-3 border-b border-line py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-sunken text-main" aria-hidden>
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{countLabel(c)}</span>
              </span>
              {c.isSystem ? (
                <Lock className="size-4 text-muted-foreground" aria-label="Locked" />
              ) : (
                <>
                  <Button variant="ghost" size="icon-sm" aria-label={`Rename ${c.name}`} onClick={() => openDrawer({ mode: "rename", category: c })}>
                    <Pencil strokeWidth={1.75} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                    <Trash2 strokeWidth={1.75} />
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          {editing && (
            <NameForm
              key={editing.mode === "rename" ? editing.category.id : "new"}
              editing={editing}
              onDone={() => setDrawerOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It's removed from every place in every trip
              {deleting && trip ? ` (${deleting.placeCount} in ${trip.name})` : ""}. Places left with no category
              move to Other.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
