import { QueryClient, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { ExportFile } from "../../shared/export.ts";
import type {
  CategoryInput,
  Expense,
  ExpenseInput,
  ExpenseList,
  ExpensePatch,
  PlaceInput,
  PlacePatch,
  PlaceStatus,
  PlaceView,
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

/** Query groups a write can affect, by the first element of their keys. */
type Group = "trips" | "active-trip" | "categories" | "places" | "stays" | "expenses";

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

function refresh(queryClient: QueryClient, groups: readonly Group[] | "all"): void {
  void queryClient.invalidateQueries({
    predicate: (q) => q.queryKey[0] !== "session" && (groups === "all" || groups.includes(q.queryKey[0] as Group)),
  });
}

/** A write that refreshes only the query groups it can change, in the background. */
function useWrite<TVars, TData>(fn: (vars: TVars) => Promise<TData>, groups: readonly Group[] | "all") {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => refresh(queryClient, groups) });
}

/** Replaces one place wherever it appears in cached place lists. */
function putPlace(queryClient: QueryClient, placeId: number, update: (p: PlaceView) => PlaceView): void {
  queryClient.setQueriesData<PlaceView[]>({ queryKey: ["places"] }, (list) =>
    list?.map((p) => (p.id === placeId ? update(p) : p)),
  );
}

/**
 * A place write that shows its result immediately: `preview` updates the cached place
 * before the request, the server's answer replaces it, and a failure restores the cache.
 */
function usePlaceWrite<TVars extends { placeId: number }>(
  fn: (vars: TVars) => Promise<{ place: PlaceView }>,
  preview: (place: PlaceView, vars: TVars) => PlaceView,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["places"] });
      const snapshot = queryClient.getQueriesData<PlaceView[]>({ queryKey: ["places"] });
      putPlace(queryClient, vars.placeId, (p) => preview(p, vars));
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key as QueryKey, data);
    },
    onSuccess: ({ place }) => {
      putPlace(queryClient, place.id, () => place);
      refresh(queryClient, ["places", "trips", "active-trip", "categories"]);
    },
  });
}

/** `list` with `expense` added, totals and day buckets recomputed. */
function withExpense(list: ExpenseList, expense: Expense): ExpenseList {
  const items = [expense, ...list.items].sort((a, b) =>
    a.spentOn === b.spentOn ? b.createdAt.localeCompare(a.createdAt) : b.spentOn.localeCompare(a.spentOn),
  );
  const byDate = new Map<string, { total: number; count: number }>();
  for (const e of items) {
    const day = byDate.get(e.spentOn) ?? { total: 0, count: 0 };
    byDate.set(e.spentOn, { total: day.total + e.amount, count: day.count + 1 });
  }
  const days = [...byDate].map(([date, d]) => ({ date, ...d })).sort((a, b) => b.date.localeCompare(a.date));
  return { items, total: list.total + expense.amount, days };
}

function putExpense(queryClient: QueryClient, expense: Expense): void {
  queryClient.setQueryData<ExpenseList>(keys.expenses(expense.tripId), (list) => list && withExpense(list, expense));
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

export const useCreateTrip = () =>
  useWrite((input: TripInput) => unwrap(client.api.trips.$post({ json: input })), ["trips", "active-trip"]);

export const useUpdateTrip = () =>
  useWrite(
    ({ tripId, patch }: { tripId: number; patch: TripPatch }) =>
      unwrap(client.api.trips[":id"].$patch({ param: id(tripId), json: patch })),
    ["trips", "active-trip"],
  );

export const useDeleteTrip = () =>
  useWrite((tripId: number) => unwrap(client.api.trips[":id"].$delete({ param: id(tripId) })), "all");

export const useSetActiveTrip = () =>
  useWrite(
    (tripId: number) => unwrap(client.api["active-trip"].$put({ json: { tripId } })),
    ["trips", "active-trip", "categories"],
  );

// ---- Categories ----

export function useCategories(tripId: number | null) {
  return useQuery({
    queryKey: keys.categories(tripId),
    queryFn: () => unwrap(client.api.categories.$get({ query: { tripId: tripId === null ? undefined : String(tripId) } })),
  });
}

export const useCreateCategory = () =>
  useWrite((input: CategoryInput) => unwrap(client.api.categories.$post({ json: input })), ["categories"]);

export const useRenameCategory = () =>
  useWrite(
    ({ categoryId, name }: { categoryId: number; name: string }) =>
      unwrap(client.api.categories[":id"].$patch({ param: id(categoryId), json: { name } })),
    ["categories"],
  );

export const useDeleteCategory = () =>
  useWrite(
    (categoryId: number) => unwrap(client.api.categories[":id"].$delete({ param: id(categoryId) })),
    ["categories", "places"],
  );

// ---- Places ----

export function usePlaces(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.places(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].places.$get({ param: id(tripId ?? 0), query: {} })),
    enabled: tripId !== undefined,
  });
}

export const useCreatePlace = () =>
  useWrite(
    ({ tripId, input }: { tripId: number; input: PlaceInput }) =>
      unwrap(client.api.trips[":id"].places.$post({ param: id(tripId), json: input })),
    ["places", "trips", "active-trip", "categories"],
  );

export const useUpdatePlace = () =>
  usePlaceWrite(
    ({ placeId, patch }: { placeId: number; patch: PlacePatch }) =>
      unwrap(client.api.places[":id"].$patch({ param: id(placeId), json: patch })),
    (place, { patch }) => ({ ...place, ...patch }),
  );

export const useSetPlaceStatus = () =>
  usePlaceWrite(
    ({ placeId, status, rating }: { placeId: number; status: PlaceStatus; rating?: number | null }) =>
      unwrap(
        client.api.places[":id"].$patch({
          param: id(placeId),
          json: rating === undefined ? { status } : { status, rating },
        }),
      ),
    (place, { status, rating }) => ({
      ...place,
      status,
      rating: rating !== undefined ? rating : status === "visited" ? place.rating : null,
    }),
  );

export const useDeletePlace = () =>
  useWrite(
    (placeId: number) => unwrap(client.api.places[":id"].$delete({ param: id(placeId) })),
    ["places", "trips", "active-trip", "categories", "expenses"],
  );

export function useAddPlaceExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, price, spentOn }: { placeId: number; price: string; spentOn: string }) =>
      unwrap(client.api.places[":id"].expenses.$post({ param: id(placeId), json: { price, spentOn } })),
    onSuccess: ({ expense, place }) => {
      putPlace(queryClient, place.id, () => place);
      putExpense(queryClient, expense);
      refresh(queryClient, ["trips", "active-trip"]);
    },
  });
}

// ---- Stays ----

export function useStays(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.stays(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].stays.$get({ param: id(tripId ?? 0) })),
    enabled: tripId !== undefined,
  });
}

const STAY_GROUPS: readonly Group[] = ["stays", "trips", "active-trip"];

export const useCreateStay = () =>
  useWrite(
    ({ tripId, input }: { tripId: number; input: StayInput }) =>
      unwrap(client.api.trips[":id"].stays.$post({ param: id(tripId), json: input })),
    STAY_GROUPS,
  );

export const useUpdateStay = () =>
  useWrite(
    ({ stayId, patch }: { stayId: number; patch: StayPatch }) =>
      unwrap(client.api.stays[":id"].$patch({ param: id(stayId), json: patch })),
    STAY_GROUPS,
  );

export const useDeleteStay = () =>
  useWrite((stayId: number) => unwrap(client.api.stays[":id"].$delete({ param: id(stayId) })), STAY_GROUPS);

// ---- Expenses ----

export function useExpenses(tripId: number | undefined) {
  return useQuery({
    queryKey: keys.expenses(tripId ?? 0),
    queryFn: () => unwrap(client.api.trips[":id"].expenses.$get({ param: id(tripId ?? 0) })),
    enabled: tripId !== undefined,
  });
}

const EXPENSE_GROUPS: readonly Group[] = ["expenses", "places", "trips", "active-trip"];

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, input }: { tripId: number; input: ExpenseInput }) =>
      unwrap(client.api.trips[":id"].expenses.$post({ param: id(tripId), json: input })),
    onSuccess: (expense) => {
      putExpense(queryClient, expense);
      refresh(queryClient, EXPENSE_GROUPS);
    },
  });
}

export const useUpdateExpense = () =>
  useWrite(
    ({ expenseId, patch }: { expenseId: number; patch: ExpensePatch }) =>
      unwrap(client.api.expenses[":id"].$patch({ param: id(expenseId), json: patch })),
    EXPENSE_GROUPS,
  );

export const useDeleteExpense = () =>
  useWrite((expenseId: number) => unwrap(client.api.expenses[":id"].$delete({ param: id(expenseId) })), EXPENSE_GROUPS);

// ---- Export and import ----

export const useImportFile = () =>
  useWrite((file: ExportFile) => unwrap(client.api.import.$post({ json: file })), "all");
