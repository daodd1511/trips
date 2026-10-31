# Place manager: plan

A self-hosted web app that keeps one trip in one place: where you stay, where you
want to eat and go, and what you spent. You save places by hand, tag them with
categories, mark them visited, and log expenses. It replaces scattered bookmarks in
TikTok and Google Maps and the cost list in iPhone Notes.

First use: a trip to Da Lat. The app supports any number of trips.

## Goals

- Keep one central list of places per trip.
- Tag each place with one or more categories, such as Breakfast, Snack, or Gift.
- Open a place's Google Maps link or TikTok source in one tap.
- Track status and a personal rating after a visit.
- Keep accommodation details per trip: location, dates, booking notes.
- Log expenses per trip, either from a saved place or as free entries, with totals.
- Authenticate once per device and never again during a trip.
- Export trips to JSON and import them back.

## Non-goals for v1

- Map view.
- Photos.
- Automatic place info (hours, address, rating) from Google Places or link parsing.
- Import from Google Maps lists, TikTok, or other bookmark sources.
- Day-by-day itinerary.
- Cost splitting between travelers, expense categories, and multiple currencies per trip.
- Automated backups.
- Multiple user accounts.

## Phases

1. **Architecture and shape.** Done: this document.
2. **UI/UX mocks.** Static, mobile-first HTML screens with realistic Da Lat sample
   data and no backend.
   1. Build four candidate design directions, each showing the main screens: trip
      view, place detail, add place, and expense log.
   2. The user chooses one direction and adjusts its styling.
   3. Extend the chosen direction to the remaining screens: login, add and edit stay,
      category management, trip list and switching, export and import.
   4. Write `DESIGN.md`: tokens, type, spacing, and the rules for each component, so
      every screen stays consistent.
   The phase ends when the user approves the mocks and `DESIGN.md`.
3. **Execution plan.** Run `/spec-plan` on this plan and `DESIGN.md` to produce
   `EXECUTION.md`. This runs only after the user confirms both architecture and UI.
4. **App implementation.** Build the app to match the approved mocks and `DESIGN.md`,
   and run it locally. Order: schema and migrations, API with tests, frontend, export
   and import.
5. **Deploy.** Ship the app through the existing `daodd1511/deploy` pipeline.

## Data model

SQLite, one file. Foreign keys enabled.

| Table | Columns |
|---|---|
| `trips` | `id`, `name`, `currency`, `theme`, `created_at` |
| `places` | `id`, `trip_id`, `name`, `maps_url`, `source_url`, `notes`, `status`, `rating`, `created_at`, `updated_at` |
| `categories` | `id`, `name`, `is_system` |
| `place_categories` | `place_id`, `category_id` |
| `stays` | `id`, `trip_id`, `name`, `maps_url`, `check_in`, `check_out`, `notes`, `created_at` |
| `expenses` | `id`, `trip_id`, `place_id`, `name`, `amount`, `spent_on`, `created_at` |
| `settings` | `active_trip_id` |

### Field rules

| Field | Rule |
|---|---|
| `trips.currency` | Required. ISO 4217 code, such as `VND` or `THB`. Default `VND`. |
| `trips.theme` | Required. A palette key from `DESIGN.md`, such as `pine-berry`. Default `pine-berry`. An unknown key renders as `pine-berry`. |
| `places.name` | Required. |
| `places.maps_url` | Required. Google Maps link. |
| `places.source_url` | Optional. TikTok, Instagram, or blog link where the place was found. |
| `places.notes` | Optional. Free text, at most 2000 characters. |
| `places.status` | Required. One of `want`, `visited`, `skipped`. Default `want`. |
| `places.rating` | Integer from 1 to 10. Allowed only when `status` is `visited`, and optional then. |
| `categories.name` | Required. Unique, case-insensitive. |
| `place_categories` | Each place has at least one category. |
| `stays.name` | Required. |
| `stays.maps_url` | Optional. Google Maps link. |
| `stays.check_in`, `stays.check_out` | Optional calendar dates. If both are set, `check_out` is on or after `check_in`. |
| `stays.notes` | Optional. Free text, at most 2000 characters: booking code, host phone, door code, Wi-Fi. |
| `expenses.place_id` | Optional. The place the expense was added from. Null for free entries, or after the place is deleted. |
| `expenses.name` | Required. Copied from the place name when added from a place, and not updated if the place is renamed. |
| `expenses.amount` | Required. Integer greater than 0, in the trip currency's main unit. |
| `expenses.spent_on` | Required calendar date. Default today. Editable. |

## Behavior

### Places

- Any status can change to any other status.
- A change from `visited` to `want` or `skipped` clears `rating`.
- Delete is a hard delete. The place's expenses remain, with `place_id` set to null.
- If a place in the same trip already has the same `maps_url`, the app warns the user
  but still allows the save. One Maps pin can cover two stalls.

### Categories

- Categories are global and shared across all trips.
- The user can add, rename, and delete categories.
- Seeded defaults: Breakfast, Lunch, Dinner, Snack / street food, Café / drinks,
  Dessert, Gift / souvenir, Sightseeing, Night market, Stay.
- **Other** is a system category (`is_system = 1`). The app seeds it on first start.
  The user cannot delete or rename it. It is the default for a new place.
- Deleting a category removes it from every place in one transaction. A place whose
  only category was the deleted one moves to **Other**.

### Trips

- The server stores the active trip in `settings.active_trip_id`. Every device opens
  the active trip directly.
- The user can switch the active trip and create, rename, and delete trips.
- The user picks a palette for each trip from the curated list in `DESIGN.md`, and can
  change it at any time.
- The trip's date range shown in the app derives from its stays' check-in and
  check-out dates. Trips have no date fields of their own.
- The user sets the trip currency at creation. The currency can change only while the
  trip has no expenses, because a change would relabel every amount.
- Deleting a trip deletes its places, stays, and expenses. The user must type the trip
  name to confirm. The confirmation suggests an export first.
- Deleting the active trip clears `active_trip_id`. The app then opens the trip list,
  or the create-trip screen when no trips remain.

### Stays

- A trip can have zero or more stays, for example two hotels on one trip.
- The trip view shows stays above the place list, unaffected by place filters.
- Stays sort by `check_in`, then by `created_at` for stays without dates.
- If a stay's notes contain a phone number, the stay shows a **Call host** button that
  opens a `tel:` link to the first number found. A phone number is a run of 9 to 11
  digits, optionally starting with `+` and separated by spaces, dots, or hyphens.
- Delete is a hard delete.

### Expenses

- An expense belongs to one trip, and optionally to one place in that trip.
- **From a place:** the user enters a price only. The app creates an expense with the
  place's name, `spent_on` set to today, and `place_id` set. If the place's status is
  `want`, the app changes it to `visited`. A `visited` or `skipped` place keeps its
  status. A place can have several expenses and shows its total.
- **Quick entry:** the user enters one line in the format `{name} {price}`, for
  example `banh mi 30k`. The app creates an expense with no `place_id`.
- **Editing:** the user edits name, amount, and date as separate fields. Delete is a
  hard delete.
- **Totals:** the trip shows a grand total and a total per `spent_on` date, in the
  trip currency.

### Price parser

Quick entry and the place price field share one parser. It never guesses: input
that does not match fails with an error, and the app saves nothing.

- Quick entry splits the line at its last space. The text before it is the name, and
  the last token is the price. `Bún bò 2 tô 60k` gives name `Bún bò 2 tô` and
  price 60000.
- The name must not be empty after trimming.
- A price token matches `^(\d+|\d+([.,]\d+)?(k|tr))$`, case-insensitive.
- Suffix `k` multiplies by 1000. Suffix `tr` multiplies by 1000000.
- A decimal separator, `.` or `,`, is allowed only with a suffix. Without a suffix,
  the price is digits only. Vietnamese prices use `.` and `,` as thousands
  separators, so `30.000` must fail rather than parse as 30.
- The result must be an integer greater than 0.

| Input | Result |
|---|---|
| `banh mi 30k` | `banh mi`, 30000 |
| `Kem bơ 49K` | `Kem bơ`, 49000 |
| `taxi 80000` | `taxi`, 80000 |
| `homestay 1.5tr` | `homestay`, 1500000 |
| `banh mi` | Error: no price |
| `30k banh mi` | Error: last token is not a price |
| `banh mi 30 k` | Error: last token is not a price |
| `banh mi 30.000` | Error: separator without a suffix |
| `x 1.2345k` | Error: not an integer |
| `x 0k` | Error: not greater than 0 |

### Listing and search

- The list shows places in the active trip.
- Category filter: multi-select, combined with OR.
- Status filter: one of `want`, `visited`, `skipped`, each with its count. Defaults
  to `want`.
- Search matches place name and notes.

### Export and import

- Export format: JSON with `"version": 1`.
- Export scope: one trip, or all trips.
- Export content per trip: name, currency, theme, places with their categories, stays, and
  expenses with their place links.
- Import accepts only that format and rejects unknown versions.
- Import always creates new trips and never overwrites. A trip whose name already
  exists gets a suffix, for example `Da Lat (imported 2026-11-20)`.
- Import matches categories by name, ignoring case, and creates missing ones. **Other**
  in a file maps to the system category.
- Import restores each expense's link to its imported place.
- Import runs in one transaction. An invalid file changes nothing.

## Authentication

- One shared password, `APP_PASSWORD`, read from the environment.
- A correct login sets a cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, one-year expiry.
  The server signs it with a key derived from `APP_PASSWORD`.
- A password change invalidates every existing cookie.
- The login route has a per-IP rate limit.
- On iOS, a Home Screen web app keeps cookies separate from Safari. Log in from the one
  you use.

## Stack

- Runtime: Bun.
- API: Hono, with Zod validation.
- Frontend: React and Vite, built to static files that Hono serves. One process, one port.
- Database: `bun:sqlite`, file at `/data/trips.db` in the container.
- Migrations: plain SQL files, applied at startup. Migrations must be additive only: new
  tables and nullable columns, no drops or renames in the same release. This keeps the
  pipeline's automatic rollback safe, because the previous image must still run against
  the migrated database.
- Components: shadcn/ui, with these rules:
  - Add every component with the shadcn CLI (`npx shadcn@latest add <component>`).
    Never copy component source by hand.
  - If shadcn has a component for a job, use it instead of a native element. For
    example, use `Button`, not `<button>`, and `Input`, not `<input>`.
  - Customize the installed components to match `DESIGN.md`, through theme tokens
    first and component source second.
- Styling: the tokens from `DESIGN.md` (colors, spacing, type), mapped to the shadcn
  theme variables.
- Icons: Lucide, the default icon set for shadcn.
- Health: `GET /health/ready` runs a query against the database.

## Deploy

The app uses the existing pipeline in `daodd1511/deploy`. The closest template is
`apps/manga-reader`, a single service with SQLite on a host volume.

### App repo: `daodd1511/trips` (public)

- `Dockerfile` that builds the frontend and runs the Bun server.
- `.github/workflows/build.yml`, copied from moviev2. It pushes
  `ghcr.io/daodd1511/trips:<sha>` and `:latest`, then dispatches
  `client_payload[app]=trips` to the deploy repo.
- No self-hosted runner is registered on this repo.

### Deploy repo: `apps/trips/`

- `compose.yml`: `name: trips`, an `app` service with `container_name: trips`, volume
  `/srv/trips/data:/data`, its own `cloudflared`, network `internal`. No host port.
- `deploy.conf`: `TAG_CONTAINER=trips`, `PROBE_HOST=trips:<port>`,
  `HEALTH_PATHS="/health/ready:10"`.
- `.env.example`: documents `APP_PASSWORD` and `TUNNEL_TOKEN`.

### Manual steps for the user

1. Create a Cloudflare tunnel for the app, with Public Hostname `trips.<your-domain>`
   routed to `http://trips:<port>`.
2. Create `/srv/trips/.env` with `APP_PASSWORD` and `TUNNEL_TOKEN`, owned by the
   runner's user, mode `0600`.
3. Create `/srv/trips/data`, writable by the container user.
4. After the first build, make the GHCR package public, then start a new deploy run.

## Risks

- **No backup during a live trip.** Backups are manual exports only. Run "export all"
  before the trip starts.
- **Integer amounts only.** A fractional price, such as ฿35.50, cannot be entered.
- **Cookie signing key derives from the password.** A leaked password gives full access
  until the user changes it.
