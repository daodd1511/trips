import type { ReactNode } from "react";

type FullScreenMessageProps = {
  title: string;
  detail?: ReactNode;
  action?: ReactNode;
};

/** A centered status screen on the main color, for loading and fatal errors. */
export function FullScreenMessage({ title, detail, action }: FullScreenMessageProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-main px-6 text-center text-main-ink" aria-live="polite">
      <div>
        <h1 className="text-[22px] font-semibold">{title}</h1>
        {detail && <p className="mt-2 text-main-muted">{detail}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </main>
  );
}
