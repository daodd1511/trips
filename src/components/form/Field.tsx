import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: ReactNode;
  /** Id of the control the label points at. */
  htmlFor?: string;
  optional?: boolean;
  /** Validation message; replaces `hint` when set. */
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** One form field: label, control, then a hint or an error, with fixed spacing. */
export function Field({ label, htmlFor, optional, error, hint, className, children }: FieldProps) {
  const labelContent = (
    <>
      {label}
      {optional && <span className="font-normal text-muted-foreground">optional</span>}
    </>
  );
  return (
    <div className={cn("grid gap-2", className)}>
      {htmlFor ? (
        <Label htmlFor={htmlFor} className="gap-1.5">
          {labelContent}
        </Label>
      ) : (
        <span className="flex items-center gap-1.5 text-sm font-medium">{labelContent}</span>
      )}
      {children}
      {error ? (
        <p className="pl-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="pl-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Vertical stack of fields with the form-wide gap. */
export function FieldStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid gap-6", className)}>{children}</div>;
}
