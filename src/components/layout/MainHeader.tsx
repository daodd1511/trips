import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MainHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Controls at the right of the title row. */
  action?: ReactNode;
  /** Content under the title, still inside the header block. */
  children?: ReactNode;
  className?: string;
};

/** The main-colored block with rounded bottom corners that opens most screens. */
export function MainHeader({ title, subtitle, action, children, className }: MainHeaderProps) {
  return (
    <header
      className={cn(
        "rounded-b-sheet bg-main px-4 pb-[18px] pt-[max(env(safe-area-inset-top),16px)] text-main-ink",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 pt-9">
        <div className="min-w-0">
          <h1 className="truncate text-[30px] font-bold leading-[1.05] tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-main-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}

type FormHeaderProps = {
  title: string;
  /** Left control, usually Cancel or Back. */
  leading: ReactNode;
  /** Right control, usually Save or New. */
  trailing?: ReactNode;
};

/** Compact main-colored bar for form and list screens. */
export function FormHeader({ title, leading, trailing }: FormHeaderProps) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center bg-main px-2 pb-3.5 pt-[max(env(safe-area-inset-top),16px)] text-main-ink">
      <div className="justify-self-start pt-9 [&_button]:text-main-ink [&_a]:text-main-ink">{leading}</div>
      <h1 className="pt-9 text-[17px] font-semibold">{title}</h1>
      <div className="justify-self-end pt-9">{trailing}</div>
    </header>
  );
}
