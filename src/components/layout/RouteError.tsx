import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";
import { FullScreenMessage } from "./FullScreenMessage.tsx";

/** Error screen for a route that failed to load or render. */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";
  return (
    <FullScreenMessage
      title="Something went wrong"
      detail={detail}
      action={<Button onClick={() => window.location.reload()}>Reload</Button>}
    />
  );
}
