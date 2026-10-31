import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExportFile } from "../../shared/export.ts";
import type {
  CategoryInput,
  ExpenseInput,
  ExpensePatch,
  PlaceInput,
  PlacePatch,
  PlaceStatus,
  StayInput,
  StayPatch,
  TripInput,
  TripPatch,
} from "../../shared/schemas.ts";
import { ApiError, client, unwrap } from "./api.ts";

const id = (n: number) => ({ id: String(n) });

export const keys = {
  session: ["session"] as const,
  trips: ["trips"] as const,
  activeTrip: ["active-trip"] as const,
  categories: (tripId: number | null) => ["categories", tripId] as const,
  places: (tripId: number) => ["places", tripId] as const,
  stays: (tripId: number) => ["stays", tripId] as const,
  expenses: (tripId: number) => ["expenses", tripId] as const,
};

/** Shared client. A 401 anywhere sends the app to the login screen. */
export function createQueryClient(onUnauthorized: () => void): QueryClient {
  const handle = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  };
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
        staleTime: 30_000,
      },
      mutations: { onError: handle },
    },
  });
  queryClient.getQueryCache().config.onError = handle;
  return queryClient;
}

// Every write can change counts and totals shown elsewhere, so a write refreshes all data.
function useWrite<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "session" }),
  });
}

// ---- Session ----

export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: () => unwrap(client.api.session.$get()),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => unwrap(client.api.login.$post({ json: { password } })),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// ---- Trips ----

export function useTrips() {
  return useQuery({ queryKey: keys.trips, queryFn: () => unwrap(client.api.trips.$get()) });
}

export function useActiveTrip() {
  return useQuery({
    queryKey: keys.activeTrip,
    queryFn: async () => (await unwrap(client.api["active-trip"].$get())).trip,
  });
}

export const useCreateTrip = () => useWrite((input: TripInput) => unwrap(client.api.trips.$post({ json: input })));

export const useUpdateTrip = () =>
  useWrite(({ tripId, patch }: { tripId: number; patch: TripPatch }) =>
    unwrap(client.api.trips[":id"].$patch({ param: id(tripId), json: patch })),
  );

export const useDeleteTrip = () =>
  useWrite((tripId: number) => unwrap(client.api.trips[":id"].$delete({ param: id(tripId) })));

export const useSetActiveTrip = () =>
  useWrite((tripId: number) => unwrap(client.api["active-trip"].$put({ json: { tripId } })));

// ---- Categories ----

export function useCategories(tripId: number | null) {
  return useQuery({
    queryKey: keys.categories(tripId),
    queryFn: () =>
      unwrap(client.api.categories.$get({ query: { tripId: tripId === null ? undefined : String(tripId) } })),
  });
}

export const useCreateCategory = () =>
  useWrite((input: CategoryInput) => unwrap(client.api.categories.$post({ json: input })));

export const useRenameCategory = () =>
  useWrite(({ categoryId, name }: { categoryId: number; name: string }) =>
    unwrap(client.api.categories[":id"].$patch({ param: id(categoryId), json: { name } })),
  );

export const useDeleteCategory = () =>
  useWrite((categoryId: number) => unwrap(client.api.categories[":id"].$delete({ param: id(categoryId) })));

// ---- Places ----

export function usePlaces(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.places(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].places.$get({ param: id(tripId ?? 0), query: {} })),
    enabled: tripId !== undefined,
  });
}

export const useCreatePlace = () =>
  useWrite(({ tripId, input }: { tripId: number; input: PlaceInput }) =>
    unwrap(client.api.trips[":id"].places.$post({ param: id(tripId), json: input })),
  );

export const useUpdatePlace = () =>
  useWrite(({ placeId, patch }: { placeId: number; patch: PlacePatch }) =>
    unwrap(client.api.places[":id"].$patch({ param: id(placeId), json: patch })),
  );

export const useSetPlaceStatus = () =>
  useWrite(({ placeId, status, rating }: { placeId: number; status: PlaceStatus; rating?: number | null }) =>
    unwrap(
      client.api.places[":id"].$patch({
        param: id(placeId),
        json: rating === undefined ? { status } : { status, rating },
      }),
    ),
  );

export const useDeletePlace = () =>
  useWrite((placeId: number) => unwrap(client.api.places[":id"].$delete({ param: id(placeId) })));

export const useAddPlaceExpense = () =>
  useWrite(({ placeId, price, spentOn }: { placeId: number; price: string; spentOn: string }) =>
    unwrap(client.api.places[":id"].expenses.$post({ param: id(placeId), json: { price, spentOn } })),
  );

// ---- Stays ----

export function useStays(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.stays(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].stays.$get({ param: id(tripId ?? 0) })),
    enabled: tripId !== undefined,
  });
}

export const useCreateStay = () =>
  useWrite(({ tripId, input }: { tripId: number; input: StayInput }) =>
    unwrap(client.api.trips[":id"].stays.$post({ param: id(tripId), json: input })),
  );

export const useUpdateStay = () =>
  useWrite(({ stayId, patch }: { stayId: number; patch: StayPatch }) =>
    unwrap(client.api.stays[":id"].$patch({ param: id(stayId), json: patch })),
  );

export const useDeleteStay = () =>
  useWrite((stayId: number) => unwrap(client.api.stays[":id"].$delete({ param: id(stayId) })));

// ---- Expenses ----

export function useExpenses(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.expenses(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].expenses.$get({ param: id(tripId ?? 0) })),
    enabled: tripId !== undefined,
  });
}

export const useCreateExpense = () =>
  useWrite(({ tripId, input }: { tripId: number; input: ExpenseInput }) =>
    unwrap(client.api.trips[":id"].expenses.$post({ param: id(tripId), json: input })),
  );

export const useUpdateExpense = () =>
  useWrite(({ expenseId, patch }: { expenseId: number; patch: ExpensePatch }) =>
    unwrap(client.api.expenses[":id"].$patch({ param: id(expenseId), json: patch })),
  );

export const useDeleteExpense = () =>
  useWrite((expenseId: number) => unwrap(client.api.expenses[":id"].$delete({ param: id(expenseId) })));

// ---- Export and import ----

export const useImportFile = () =>
  useWrite((file: ExportFile) => unwrap(client.api.import.$post({ json: file })));
