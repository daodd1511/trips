import { createBrowserRouter, Navigate } from "react-router";
import { AppShell, PlainShell, RequireAuth } from "@/components/layout/AppShell";
import { RouteError } from "@/components/layout/RouteError";
import { LoginPage } from "@/pages/LoginPage";
import { WelcomePage } from "@/pages/WelcomePage";

const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => ({
  lazy: { Component: async () => (await load())[name] },
});

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage, ErrorBoundary: RouteError },
  {
    Component: RequireAuth,
    ErrorBoundary: RouteError,
    children: [
      // Previews its own palette, so it sits outside the shells that set the trip palette.
      { path: "/welcome", Component: WelcomePage },
      {
        Component: PlainShell,
        children: [
          { path: "/trips", ...page(() => import("@/pages/TripsPage"), "TripsPage") },
          { path: "/categories", ...page(() => import("@/pages/CategoriesPage"), "CategoriesPage") },
        ],
      },
      {
        Component: AppShell,
        children: [
          { index: true, element: <Navigate to="/places" replace /> },
          { path: "/places", ...page(() => import("@/pages/PlacesPage"), "PlacesPage") },
          { path: "/stays", ...page(() => import("@/pages/StaysPage"), "StaysPage") },
          { path: "/spending", ...page(() => import("@/pages/SpendingPage"), "SpendingPage") },
          { path: "/trip", ...page(() => import("@/pages/TripSettingsPage"), "TripSettingsPage") },
        ],
      },
      {
        element: <AppShell withNav={false} />,
        children: [
          { path: "/places/new", ...page(() => import("@/pages/PlaceFormPage"), "PlaceFormPage") },
          { path: "/places/:id/edit", ...page(() => import("@/pages/PlaceFormPage"), "PlaceFormPage") },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
