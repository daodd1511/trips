import { ApiError } from "./api.ts";

/** Downloads an export from `path` (an `/api/...export` route) as the file the server names. */
export async function downloadExport(path: string): Promise<void> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) {
    let message = "Export failed";
    try {
      const body: unknown = await res.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error;
    } catch {
      // Keep the generic message.
    }
    throw new ApiError(res.status, message);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "trips-export.json";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
