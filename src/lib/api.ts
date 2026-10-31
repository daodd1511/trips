import { hc } from "hono/client";
import type { AppType } from "../../server/app.ts";

/** Typed client for the server routes. Requests carry the session cookie. */
export const client = hc<AppType>("/", { init: { credentials: "same-origin" } });

/** A non-2xx response, with the server's `{ error }` message. */
export class ApiError extends Error {
  readonly status: number;
  /** The parsed error body, for extra fields such as `remaining`. */
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type JsonResponse = { ok: boolean; status: number; json(): Promise<unknown> };
type Body<R> = R extends { json(): Promise<infer T> } ? T : never;
/** The 2xx body of a typed client response: every body except the `{ error }` shape. */
type SuccessBody<R> = Exclude<Body<R>, { error: string }>;

/** Resolves a client response to its JSON body, throwing `ApiError` on a non-2xx status. */
export async function unwrap<R extends JsonResponse>(response: Promise<R>): Promise<SuccessBody<R>> {
  const res = await response;
  if (res.ok) return (await res.json()) as SuccessBody<R>;
  let message = "Something went wrong";
  let body: unknown = null;
  try {
    body = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      message = body.error;
    }
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  throw new ApiError(res.status, message, body);
}
