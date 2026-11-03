import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
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
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 px-5 pb-[max(env(safe-area-inset-bottom),28px)] pt-3">
      <DrawerTitle className="text-[22px] font-semibold tracking-[-0.02em]">Edit expense</DrawerTitle>
      <DrawerDescription className="sr-only">Change the name, amount, or date</DrawerDescription>
      <Field label="Name" htmlFor="expense-name" error={errors.name?.message}>
        <Input id="expense-name" aria-invalid={!!errors.name} {...form.register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="expense-price" error={errors.price?.message}>
          <Input id="expense-price" autoComplete="off" aria-invalid={!!errors.price} {...form.register("price")} />
        </Field>
        <Field label="Date" htmlFor="expense-date" error={errors.spentOn?.message}>
          <Input id="expense-date" type="date" aria-invalid={!!errors.spentOn} {...form.register("spentOn")} />
        </Field>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
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
