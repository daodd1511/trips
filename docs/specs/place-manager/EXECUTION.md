# Place manager — Execution Plan

Spec: [PLAN.md](PLAN.md), UI: [DESIGN.md](DESIGN.md). Rulebook: `docs/specs/RULEBOOK.md`.
Integration branch: `main`. Branch model: sequential, merged locally — no GitHub remote until the deploy
phase (user decision): each phase fast-forwards `main` locally instead of push + PR; re-probe
gh stack once origin exists. User authorized phases 3–5 to run, merge, and start the next phase without
per-phase approval; stop before phase 6.

Layout (single package): `src/` web (Vite root), `server/` Bun + Hono, `shared/` code both
import. Tests: `bun test`, backend and shared only — no frontend tests, by user decision.

## STATUS

- Current phase: 4 — in-progress
- Phase 1 — Backend foundation: done (gate passed; fresh review: 4 P2 fixed, re-review P1 resolved by user decision on phone format, final fix not re-reviewed)
- Phase 2 — Domain API: done (gate passed; fresh review: 1 P2 fixed, re-review clean)
- Phase 3 — Export and import: done (gate passed; fresh review: 2 P2 fixed, re-review clean)
- Phase 4 — Frontend foundation: in-progress
- Phase 5 — Frontend screens: pending
- Phase 6 — Deploy: pending
- Verification debt: none

## Phase 1 — Backend foundation

Branch: `place-manager/phase-1-backend-foundation` (off `main`)

Everything server-side depends on the DB, schema, shared types, and auth landing first.

Produces: `shared/price.ts` → `type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }`, `parsePrice(token: string): ParseResult<number>`, `parseQuickEntry(line: string): ParseResult<{ name: string; amount: number }>`; `shared/phone.ts` → `findPhoneNumber(text: string): string | null` (10 digits starting with `0`); `shared/themes.ts` → `THEME_KEYS`, `type ThemeKey`, `DEFAULT_THEME`; `shared/schemas.ts` → Zod `tripInput`, `placeInput`, `stayInput`, `expenseInput`, `categoryInput` and types `Trip`, `Place`, `PlaceStatus`, `Stay`, `Expense`, `Category`; `server/db.ts` → `openDb(path: string): Database`, `migrate(db: Database, dir?: string): void`, `categoryKey(name: string): string`; `server/auth.ts` → `sessionSecret(password: string): string`, `signSession(expiresAt: number, secret: string): string`, `verifySession(token: string, secret: string, now: number): boolean`, `requireAuth(secret: string, now: () => number): MiddlewareHandler`, `createLoginLimiter(max?, windowMs?): LoginLimiter`; `server/app.ts` → `createApp(deps: AppDeps)` with `AppDeps = { db; password; now?; limiter? }`; domain routes mount on its internal `api` sub-app, `type AppType`

Fresh review: required — authentication and persistent-data migrations

- [x] Add deps `hono`, `zod`; add `tsconfig.server.json` (strict, `types: ["bun"]`, include `server`, `shared`) and reference it from `tsconfig.json`; add `@types/bun`
- [x] `shared/price.ts`: parser per PLAN.md → "Price parser", including the separator-without-suffix rule
- [x] `shared/phone.ts`: 9–11 digits, optional `+`, separators space/`.`/`-`, per PLAN.md → "Stays"
- [x] `shared/themes.ts`: the five keys from DESIGN.md → "Palettes", default `pine-berry`
- [x] `shared/schemas.ts`: Zod schemas and inferred types for every table in PLAN.md → "Data model" and "Field rules"
- [x] `server/migrations/001_init.sql`: all tables, FKs on, `ON DELETE CASCADE` trip → places/stays/expenses, `ON DELETE SET NULL` expenses.place_id, CHECKs for status, rating 1–10, amount > 0, currency 3 letters; unique `lower(name)` on categories
- [x] `server/db.ts`: `openDb` sets `PRAGMA foreign_keys = ON` and WAL; `migrate` applies `server/migrations/*.sql` in order, tracked in `schema_migrations`, each in a transaction; seeds default categories and system **Other** once
- [x] `server/auth.ts`: HMAC-SHA256 session token `<expiresAt>.<sig>` keyed on `HMAC(APP_PASSWORD, "trips-session-v1")`; constant-time compare; limiter 5 failed logins per IP per minute, IP from `CF-Connecting-IP` then socket address (judgment call: numbers match the login mock)
- [x] `server/app.ts`: `POST /api/login` (sets cookie `session`, HttpOnly, Secure, SameSite=Lax, Max-Age 1 year), `POST /api/logout`, `GET /api/session`, `GET /health/ready` (runs `SELECT 1`), `requireAuth` on every other `/api/*`
- [x] `server/index.ts`: reads `APP_PASSWORD` (required), `DATA_DIR` (default `./data`), `PORT` (default `3000`); opens `${DATA_DIR}/trips.db`, migrates, serves `dist/` with SPA fallback
- [x] `package.json` scripts: `dev:server` (`bun --watch server/index.ts`), `typecheck` (`tsc -b`), `test` (`bun test`); Vite dev proxy `/api` and `/health` → `localhost:3000` in `vite.config.ts`
- [x] Tests: `shared/price.test.ts` (every row of PLAN.md's parser table), `shared/phone.test.ts`, `server/auth.test.ts` (sign/verify, expiry, wrong password, rate limit), `server/db.test.ts` (migrate is idempotent, seeds Other once, FK cascade)
- [x] (amended 2026-11-01) `shared/price.ts`: exact BigInt arithmetic so long fractions such as `1.0000000000000001k` are rejected, not rounded; test in `shared/price.test.ts`
- [x] (amended 2026-11-01) `shared/phone.ts`: find the first 9–11 digit span inside longer digit runs (after a house number, a price, or a second number); tests in `shared/phone.test.ts`
- [x] (amended 2026-11-01) `server/migrations/001_init.sql`: declare every table `STRICT` so text or real amounts and ratings are rejected; test in `server/db.test.ts`
- [x] (amended 2026-11-01) `server/db.ts` `categoryKey`: NFC-normalize before lowercasing; test in `server/db.test.ts`
- [x] (amended 2026-11-01) `shared/phone.ts`: narrow to 10 digits starting with `0`, no separators, per user decision after re-review; tests in `shared/phone.test.ts`; PLAN.md → "Stays" updated
- [x] (amended 2026-11-01) `server/migrations/001_init.sql`: drop the seeded Stay category, per user decision; seed test in `server/db.test.ts`; PLAN.md → "Categories" updated

**Phase gate (hard):**
- [x] `bun run typecheck`
- [x] `bun test server shared` (fallback: bun has no related-tests mode; narrowest suite holding all backend consumers)

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Phase 2 — Domain API

Branch: `place-manager/phase-2-domain-api` (off `main`)

All CRUD and business rules over the schema from phase 1; the frontend consumes this API.

Consumes: `createApp`, `openDb`, `migrate`, `requireAuth`, schemas and types from `shared/schemas.ts`, `parsePrice`, `THEME_KEYS`
Produces: `shared/schemas.ts` → `TripSummary`, `PlaceView`, `CategoryView`, `ExpenseList`, `ExpenseDay`, patch schemas `tripPatch`, `placePatch`, `stayPatch`, `expensePatch`, `placeExpenseInput`; `shared/search.ts` → `searchKey(text: string): string`; `server/http.ts` → `HttpError`, `jsonBody`, `idParam`, `todayIn`; `AppDeps.timeZone` (env `TIME_ZONE`, default `Asia/Ho_Chi_Minh`); `POST /api/trips` makes the first trip active; `POST|PATCH` place responses are `{ place: PlaceView, duplicateOf }`; `POST /api/places/:id/expenses` takes `{ price, spentOn? }` and returns `{ expense, place }`; routes on `AppType` — `GET|POST /api/trips`, `PATCH|DELETE /api/trips/:id`, `GET|PUT /api/active-trip`, `GET|POST /api/trips/:id/places`, `PATCH|DELETE /api/places/:id`, `GET|POST /api/categories`, `PATCH|DELETE /api/categories/:id`, `GET|POST /api/trips/:id/stays`, `PATCH|DELETE /api/stays/:id`, `GET|POST /api/trips/:id/expenses`, `POST /api/places/:id/expenses`, `PATCH|DELETE /api/expenses/:id`; `server/repo/*.ts` functions named per route

Fresh review: required — destructive operations (trip and category delete) and financial calculations (expense totals)

- [x] `server/repo/trips.ts` + `server/routes/trips.ts`: CRUD; currency change rejected (409) when the trip has expenses; theme validated against `THEME_KEYS`; delete cascades and clears `settings.active_trip_id` if it pointed there; list returns place count, total spent, and date range derived from stays
- [x] `server/routes/settings.ts`: `GET|PUT /api/active-trip`
- [x] `server/repo/places.ts` + `server/routes/places.ts`: CRUD with category ids (≥1, default Other); rating only when `visited`, cleared on leaving `visited`; list filters `status`, `categories` (OR), `q` (name + notes); create/update response carries `duplicateOf` when another place in the trip has the same `maps_url`
- [x] `server/repo/categories.ts` + `server/routes/categories.ts`: CRUD; rename/delete of `is_system` rejected (403); delete in one transaction moves places left without a category to Other; delete response returns `{ removedFrom: number, movedToOther: number }`
- [x] `server/repo/stays.ts` + `server/routes/stays.ts`: CRUD; `check_out >= check_in` when both set; list sorted per PLAN.md → "Stays"
- [x] `server/repo/expenses.ts` + `server/routes/expenses.ts`: CRUD; `POST /api/places/:id/expenses` takes `{ price: string }`, parses with `parsePrice`, copies place name, sets `spent_on` to today, flips `want` → `visited` in the same transaction; list returns items plus grand total and per-day totals
- [x] Mount all routes in `server/app.ts` behind `requireAuth`; export the composed `AppType`
- [x] Tests: `server/routes/trips.test.ts` (currency lock, cascade, active-trip clear), `server/routes/places.test.ts` (rating rules, duplicate flag, filters), `server/routes/categories.test.ts` (Other protected, delete reassignment counts), `server/routes/expenses.test.ts` (auto-visit, rejected prices, totals per day)

- [x] (amended 2026-11-01) `server/app.ts` `onError`: return Hono `HTTPException` statuses (malformed JSON → 400) instead of 500; test in `server/routes/trips.test.ts`
- [x] (amended 2026-11-01) `server/routes/stays.test.ts`: date check on create and patch, ordering; omitted-field preservation on place, stay, trip, and expense patches; 401 on a domain route without a session

**Phase gate (hard):**
- [x] `bun run typecheck`
- [x] `bun test server shared` (fallback, as phase 1)

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Phase 3 — Export and import

Branch: `place-manager/phase-3-export-import` (off `main`)

Reads and writes every table, so it needs the full domain from phase 2 and stands alone as the data-safety path.

Consumes: repo functions from `server/repo/*.ts`, `shared/schemas.ts` types, `THEME_KEYS`
Produces: `shared/export.ts` → `exportFileSchema` (Zod, `version: 1`, places carry a file-local `ref`, expenses a `placeRef`), `EXPORT_VERSION`, `type ExportFile`, `type ExportTrip`; `server/repo/export.ts` → `exportTrips(db, now: Date, tripIds?)`; `server/repo/import.ts` → `importFile(db, file, today): ImportResult`; routes `GET /api/export`, `GET /api/trips/:id/export`, `POST /api/import` → `{ trips: { id: number; name: string }[] }`

Fresh review: required — hard-to-reverse writes (bulk import into the live database)

- [x] `shared/export.ts`: schema per PLAN.md → "Export and import" (trip name, currency, theme, places with category names, stays, expenses with a place reference local to the file)
- [x] `server/repo/export.ts`: `exportTrips(db, tripIds?: number[]): ExportFile`
- [x] `server/repo/import.ts`: `importFile(db, file: ExportFile, today: string)` in one transaction; rejects unknown `version`; renames clashing trips to `<name> (imported <today>)`; matches categories case-insensitively, maps `Other` to the system row; restores expense → place links; unknown theme → `pine-berry`
- [x] `server/routes/export.ts`: export endpoints send `Content-Disposition: attachment; filename="trips-<slug>-<date>.json"`; import accepts JSON body ≤ 5 MB
- [x] Tests: `server/repo/import.test.ts` — round trip export → import equals source (ids aside), name clash suffix, category matching, invalid file leaves the DB unchanged, unknown version rejected

- [x] (amended 2026-11-01) `server/repo/export.ts`: order place categories by `name_key` (Other last) so round trips are stable with custom categories; test in `server/repo/import.test.ts`
- [x] (amended 2026-11-01) `server/repo/import.ts` `freeTripName`: cut the name so the suffix fits the 200-character limit; test in `server/repo/import.test.ts`

**Phase gate (hard):**
- [x] `bun run typecheck`
- [x] `bun test server shared` (fallback, as phase 1)

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Phase 4 — Frontend foundation

Branch: `place-manager/phase-4-frontend-foundation` (off `main`)

Theme, components, data layer, and shell must exist before any screen.

Consumes: `type AppType`, `shared/schemas.ts` types, `THEME_KEYS`, `parsePrice`, `parseQuickEntry`
Produces: `src/lib/api.ts` → `api` (`hc<AppType>` client); `src/lib/queries.ts` → TanStack Query hooks `useTrips`, `useActiveTrip`, `usePlaces`, `useCategories`, `useStays`, `useExpenses`, and matching mutation hooks; `src/components/theme/TripTheme.tsx` → `<TripTheme theme={ThemeKey}>`; `src/components/layout/AppShell.tsx`, `BottomNav.tsx`, `MainHeader.tsx`; routes in `src/router.tsx`

Fresh review: not required

- [ ] Tailwind v4 via `@tailwindcss/vite`; `npx shadcn@latest init`, then `npx shadcn@latest add button input textarea select toggle-group drawer alert-dialog alert badge sonner tabs` (CLI only, per PLAN.md → "Stack")
- [ ] `src/index.css`: DESIGN.md tokens and the five palettes as `[data-theme]` blocks; map shadcn variables (`--primary` → accent, etc.); Lexend via `@fontsource/lexend`; `lucide-react` icons
- [ ] Customize installed components to DESIGN.md → "Components" (pill radius, `onMain` button variant, ToggleGroup selected → `--main`, floating Drawer inset)
- [ ] `src/lib/format.ts`: `formatMoney(amount, currency)`, `formatMoneyShort`, date formats per DESIGN.md → "Formatting"; `src/lib/category-icons.ts` per DESIGN.md → "Icons"
- [ ] `src/lib/api.ts`, `src/lib/queries.ts` (`@tanstack/react-query`), `src/router.tsx` (`react-router`): routes `/login`, `/welcome`, `/places`, `/places/new`, `/places/:id/edit`, `/stays`, `/spending`, `/trip`, `/trips`, `/categories`
- [ ] `src/pages/LoginPage.tsx` and `src/pages/WelcomePage.tsx` (first run: create trip, import); auth guard redirects to `/login` on 401 and to `/welcome` when no trips exist
- [ ] `AppShell` applies `<TripTheme>` from the active trip; `BottomNav` per DESIGN.md (Places, Stays, Add, Spending, Trip)
- [ ] Remove the Vite demo files (`src/App.css`, `src/assets/react.svg`, demo `App.tsx` content)

**Phase gate (hard):**
- [ ] `bun run typecheck`
- [ ] No test item: no frontend tests, by user decision

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Phase 5 — Frontend screens

Branch: `place-manager/phase-5-frontend-screens` (off `main`)

Every screen in DESIGN.md → "Screens", built on the phase 4 shell and hooks.

Consumes: `api`, query hooks from `src/lib/queries.ts`, `AppShell`, `MainHeader`, `TripTheme`, `formatMoney`, `parsePrice`, `parseQuickEntry`, `findPhoneNumber`, `exportFileSchema`

Fresh review: not required

- [ ] `src/pages/PlacesPage.tsx`: header with current stay line, category tiles, search, status filter with counts, place list
- [ ] `src/components/places/PlaceDrawer.tsx`: links, status, rating 1–10, notes, spent-here with price field and quick amounts, toast on add
- [ ] `src/pages/PlaceFormPage.tsx`: create/edit, category picks, `duplicateOf` alert
- [ ] `src/pages/SpendingPage.tsx`: totals block, list by day, floating quick entry with live `parseQuickEntry` feedback
- [ ] `src/pages/StaysPage.tsx` + `src/components/stays/StayDrawer.tsx`: current stay first, Call host via `findPhoneNumber`, date validation
- [ ] `src/pages/TripsPage.tsx`: switch, create, export all (download), import (file input → `POST /api/import`, toast with result)
- [ ] `src/pages/TripSettingsPage.tsx`: name, currency (locked with reason), palette picker, export this trip, delete with typed-name `AlertDialog`
- [ ] `src/pages/CategoriesPage.tsx`: add, rename, delete `AlertDialog` showing the counts that move to Other; Other locked
- [ ] Empty, loading, and error states for each list per DESIGN.md

**Phase gate (hard):**
- [ ] `bun run typecheck`
- [ ] No test item: no frontend tests, by user decision

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Phase 6 — Deploy

Branch: `place-manager/phase-6-deploy` (off `main`)

Ships the finished app; needs the GitHub repo `daodd1511/trips` linked as origin first.

Consumes: `server/index.ts` env contract (`APP_PASSWORD`, `DATA_DIR`, `PORT`), `GET /health/ready`

Fresh review: required — secrets handling and CI/deploy infrastructure

- [ ] `Dockerfile`: multi-stage `oven/bun`; build web, run `server/index.ts` as non-root; `DATA_DIR=/data`, `PORT=3000`
- [ ] `.dockerignore`
- [ ] `.github/workflows/build.yml` per PLAN.md → "Deploy" (copied from moviev2: GHCR `:sha` + `:latest`, dispatch `client_payload[app]=trips`)
- [ ] In `daodd1511/deploy`: `apps/trips/compose.yml`, `apps/trips/deploy.conf`, `apps/trips/.env.example` per PLAN.md → "Deploy" (separate repo — separate branch and PR there)

**Phase gate (hard):**
- [ ] `bun run typecheck`
- [ ] `bun test server shared` (fallback, as phase 1)

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR.

## Spec gate (hard — once, before the final phase's PR)

- [ ] `bun test`
- [ ] `bun run build`
- [ ] `docker build -t trips:spec-gate .` (environment-blocked if Docker is not running locally → `[~]` with substitute evidence)
