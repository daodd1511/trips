import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useLogin, useSession } from "@/lib/queries";
import { useTripTheme } from "@/components/theme/use-trip-theme";

const schema = z.object({ password: z.string().min(1, "Enter the password") });
type Values = z.infer<typeof schema>;

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Can't reach the server. Try again.";
  const body = error.body;
  if (error.status === 401 && body && typeof body === "object" && "remaining" in body && typeof body.remaining === "number") {
    if (body.remaining === 0) return "Wrong password. Wait a minute, then try again.";
    return `Wrong password. ${body.remaining} ${body.remaining === 1 ? "try" : "tries"} left before a 1-minute wait.`;
  }
  return error.message;
}

export function LoginPage() {
  useTripTheme("pine-berry");
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "" } });

  if (session.data?.authenticated) return <Navigate to="/" replace />;

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await login.mutateAsync(password);
      navigate("/", { replace: true });
    } catch {
      form.setFocus("password");
    }
  });

  const fieldError = form.formState.errors.password?.message;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-main text-main-ink">
      <div className="flex-1 px-6 pt-[max(env(safe-area-inset-top),24px)]">
        <h1 className="mt-24 text-[44px] font-bold leading-none tracking-[-0.04em]">Trips</h1>
        <p className="mt-3 max-w-[28ch] text-main-muted">Where you stay, where to eat, and what you spent.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-3 rounded-t-sheet bg-background px-5 pb-[max(env(safe-area-inset-bottom),40px)] pt-6 text-ink"
      >
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!fieldError || login.isError}
            {...form.register("password")}
          />
          {fieldError && <p className="pl-1 text-xs text-danger">{fieldError}</p>}
        </div>
        {login.isError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{loginErrorMessage(login.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">You stay signed in on this device for a year.</p>
      </form>
    </main>
  );
}
