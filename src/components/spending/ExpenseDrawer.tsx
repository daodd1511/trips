import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteExpense, useUpdateExpense } from "@/lib/queries";
import { parsePrice } from "../../../shared/price.ts";
import type { Expense } from "../../../shared/schemas.ts";

const schema = z.object({
  name: z.string().trim().min(1, "Give the expense a name").max(200),
  price: z.string().superRefine((value, ctx) => {
    const parsed = parsePrice(value);
    if (!parsed.ok) ctx.addIssue({ code: "custom", message: parsed.error });
  }),
  spentOn: z.iso.date("Pick a date"),
});
type Values = z.infer<typeof schema>;

type ExpenseDrawerProps = {
  /** Kept set while the drawer animates closed. */
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
};

/** Edit or delete one expense. The link to its place never changes. */
export function ExpenseDrawer({ expense, open, onClose }: ExpenseDrawerProps) {
  return (
    <Drawer open={open && expense !== null} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent>
        {expense && <ExpenseForm key={expense.id} expense={expense} onDone={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function ExpenseForm({ expense, onDone }: { expense: Expense; onDone: () => void }) {
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: expense.name, price: String(expense.amount), spentOn: expense.spentOn },
  });
  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = parsePrice(values.price);
    if (!parsed.ok) return;
    try {
      await updateExpense.mutateAsync({
        expenseId: expense.id,
        patch: { name: values.name.trim(), amount: parsed.value, spentOn: values.spentOn },
      });
      toast.success("Expense saved");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the expense");
    }
  });

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success(`Deleted ${expense.name}`);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the expense");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 px-[18px] pb-[max(env(safe-area-inset-bottom),22px)] pt-3">
      <DrawerTitle className="text-[22px] font-semibold tracking-[-0.02em]">Edit expense</DrawerTitle>
      <DrawerDescription className="sr-only">Change the name, amount, or date</DrawerDescription>
      <div className="grid gap-2">
        <Label htmlFor="expense-name">Name</Label>
        <Input id="expense-name" aria-invalid={!!errors.name} {...form.register("name")} />
        {errors.name && <p className="pl-1 text-xs text-danger">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="expense-price">Amount</Label>
          <Input id="expense-price" autoComplete="off" aria-invalid={!!errors.price} {...form.register("price")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input id="expense-date" type="date" aria-invalid={!!errors.spentOn} {...form.register("spentOn")} />
        </div>
      </div>
      {(errors.price || errors.spentOn) && (
        <p className="-mt-2 pl-1 text-xs text-danger">{errors.price?.message ?? errors.spentOn?.message}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="destructiveGhost" onClick={handleDelete} disabled={deleteExpense.isPending}>
          <Trash2 aria-hidden />
          Delete
        </Button>
        <Button type="submit" disabled={updateExpense.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
