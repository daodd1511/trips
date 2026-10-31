import { Upload } from "lucide-react";
import { useRef, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useImportFile } from "@/lib/queries";
import type { ExportFile } from "../../../shared/export.ts";

type ImportButtonProps = {
  /** Button content; defaults to an upload icon and "Import from a file". */
  children?: ReactNode;
  variant?: "ghost" | "secondary";
  className?: string;
  onImported?: (trips: { id: number; name: string }[]) => void;
};

/** Picks a JSON export file and imports it as new trips. The server validates the file. */
export function ImportButton({ children, variant = "ghost", className, onImported }: ImportButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  const importFile = useImportFile();

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error("That file isn't a Trips export");
      return;
    }
    try {
      const result = await importFile.mutateAsync(parsed as ExportFile);
      const names = result.trips.map((t) => t.name).join(", ");
      toast.success(`Imported ${result.trips.length} trip${result.trips.length === 1 ? "" : "s"}: ${names}`);
      onImported?.(result.trips);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        variant={variant}
        className={className}
        disabled={importFile.isPending}
        onClick={() => input.current?.click()}
      >
        {children ?? (
          <>
            <Upload aria-hidden />
            Import from a file
          </>
        )}
      </Button>
    </>
  );
}
