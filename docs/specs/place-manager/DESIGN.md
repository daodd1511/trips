# Place manager: design

The visual system for the app. The reference mocks are in
`design/app/app.html`, and the tokens are in `design/app/tokens.css`. Where this
document and the mocks disagree, this document wins.

## Direction

The app is a phone-first tool that you use on the street during a trip. Each trip has
its own palette: a dark **main** color that frames the screen, and a bright
**accent** for the one action that matters on each screen. Everything else is
neutral, so the palette can change per trip without breaking the layout.

- Controls are round and thumb-sized. Every touch target is at least 36px tall, and
  primary controls are 44px.
- Screens use a main-colored header block with rounded bottom corners. The content
  sits on white below it.
- Navigation is a floating main-colored bar with a central accent add button.
- Detail and edit views open as a floating bottom drawer. Destructive confirmations
  open as a centered dialog.

## Tokens

### Neutrals (fixed for all trips)

| Token | Value | Use |
|---|---|---|
| `--ground` | `#ffffff` | Page background |
| `--sunken` | `#f2f5f3` | Inputs, chips, tiles, setting groups |
| `--sunken-hover` | `#e6ece9` | Hover on sunken controls |
| `--ink` | `#102019` | Body text, toasts |
| `--muted` | `#5a6a62` | Secondary text, labels |
| `--line` | `#e3e9e6` | Row dividers |
| `--scrim` | `rgb(16 32 25 / 0.45)` | Behind drawers and dialogs |
| `--danger` | `#b42318` | Destructive actions, field errors |
| `--danger-soft` | `#fee4e2` | Error alert background |

### Palette tokens (set per trip)

| Token | Use |
|---|---|
| `--main` | Header blocks, nav bar, selected chips, tiles, and pills |
| `--main-2` | Raised surfaces on main: the stay line, day totals |
| `--main-ink` | Text and icons on main and main-2 |
| `--main-muted` | Secondary text on main and main-2 |
| `--accent` | Primary button fill, central add button, selected rating |
| `--accent-ink` | Text and icons on accent |
| `--accent-soft` | Warning alert, quick amount chips, rating below the selected value |
| `--accent-deep` | Accent-colored text and icons on white or on accent-soft |

In code, the palette tokens are `--trip-main`, `--trip-main-2`, `--trip-main-ink`,
`--trip-main-muted`, `--trip-accent`, `--trip-accent-ink`, `--trip-accent-soft`, and
`--trip-accent-deep`, exposed to Tailwind as `main`, `main-2`, `main-ink`, `main-muted`,
`brand`, `brand-ink`, `brand-soft`, and `brand-deep`. The prefix avoids a clash with
shadcn's own `--accent` variable, which means a hover background.

**Never place `--accent` as text or an icon on white.** Light accents, such as
Lantern's yellow, fail contrast there. Use `--accent-deep` instead.

### Palettes

Every text pair in each palette passes WCAG AA (4.5:1). The pairs checked are:
main-ink and main-muted on main and main-2, white on main, accent-ink on accent, and
accent-deep on accent-soft and on white.

| Key | Name | Main | Main 2 | Main ink | Main muted | Accent | Accent ink | Accent soft | Accent deep |
|---|---|---|---|---|---|---|---|---|---|
| `pine-berry` | Pine & Berry | `#123a2b` | `#1b4a38` | `#e8f2ec` | `#a9c6b7` | `#d6245c` | `#ffffff` | `#fde6ee` | `#a8173f` |
| `sea-coral` | Sea & Coral | `#0c3a4d` | `#144d64` | `#e6f3f8` | `#9cc3d3` | `#ff6b57` | `#2b0b05` | `#ffe7e3` | `#a52a17` |
| `lantern` | Lantern | `#103f40` | `#1a5152` | `#e7f3f1` | `#a3c7c3` | `#f6c343` | `#2b1d00` | `#fdf1cf` | `#7a5600` |
| `rice-gold` | Rice & Gold | `#34421c` | `#435426` | `#f1f3e3` | `#bcc79d` | `#e0a325` | `#2a1c00` | `#fbefd2` | `#7b5300` |
| `ink-chili` | Ink & Chili | `#18181b` | `#27272b` | `#f4f4f5` | `#a8a8b0` | `#d92a24` | `#ffffff` | `#fde4e2` | `#a3170f` |

- The default palette for a new trip is `pine-berry`.
- Screens before login, and the first-run screen, use `pine-berry`, because the
  server shows no trip data before authentication.
- **Known exception:** the Pine & Berry add button reaches only 2.56:1 against the
  nav bar. Its white plus icon reaches 4.92:1 against the button, so you can still
  identify the control.
- To add a palette, add one entry with all eight tokens, then run the same contrast
  checks before you merge it.

### Shape

| Token | Value | Use |
|---|---|---|
| `--radius-pill` | `999px` | Buttons, inputs, chips, nav bar, toasts |
| `--radius-tile` | `16px` | Category tiles, palette options, alerts |
| `--radius-card` | `18px` | Stay cards, setting groups, textareas |
| `--radius-sheet` | `28px` | Drawers, dialogs, header block corners |

Elevation: only floating elements get a shadow: the nav bar, drawers, dialogs, and
the quick-entry bar. Resting surfaces use a tone step (`--sunken`) and no shadow.
A surface never has both a border and a shadow.

### Spacing

The spacing scale is 4, 8, 12, 16, and 24px. The screen side margin is 16px. Gaps
inside a group are 6–8px, and gaps between groups are 16–18px.

### Type

- One family: **Lexend**, weights 400, 500, 600, and 700. Lexend supports
  Vietnamese diacritics, which every place name needs.
- Numbers use `font-variant-numeric: tabular-nums` everywhere, so amounts line up.

| Size | Weight | Use |
|---|---|---|
| 38px | 700 | Trip spending total |
| 30px | 700 | Header title (trip name, Stays, Trip) |
| 22px | 600 | Drawer and dialog title |
| 17px | 600 | Form header title, stay name |
| 15px | 400–500 | Body, inputs, list titles |
| 13px | 400–500 | Labels, list sublines, chips |
| 12px | 400 | Hints, field errors |
| 10–11px | 500 | Tile labels and nav labels only |

Headings use letter spacing from -0.02em to -0.03em. Nothing goes below -0.04em.

### Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (exponential ease-out).
- A new expense row flashes `--accent-soft`, then fades to transparent over 0.9s.
- Drawers use the shadcn Drawer defaults.
- Under `prefers-reduced-motion: reduce`, the app removes all of these.

### Icons

Lucide, at 18px with a stroke width of 1.75, and 20px inside category tiles. Each
category has one fixed icon:

| Category | Lucide icon |
|---|---|
| Breakfast | `egg-fried` |
| Lunch | `soup` |
| Dinner | `utensils` |
| Snack / street food | `sandwich` |
| Café / drinks | `coffee` |
| Dessert | `ice-cream-cone` |
| Gift / souvenir | `gift` |
| Sightseeing | `mountain` |
| Night market | `lamp` |
| Other | `circle-dashed` |
| A category the user creates | `tag` |

No emoji anywhere: not in labels, empty states, or toasts.

## Components

Every component comes from shadcn/ui, added with the CLI and themed through the
tokens above. The table maps each mock pattern to its shadcn component.

| Pattern in the mocks | shadcn component | Variant and customization |
|---|---|---|
| Primary action (Save, Add, Directions) | `Button` | `default` → `--accent` fill, `--accent-ink` text, pill radius, 44px |
| Secondary action (TikTok, Open) | `Button` | `secondary` → `--sunken` fill |
| Header action on main | `Button` | Custom variant `onMain` → `--main-2` fill, `--main-ink` text |
| Text action (Cancel, Edit) | `Button` | `ghost` |
| Destructive confirm | `Button` | `destructive` → `--danger` fill |
| Destructive inline (Delete row) | `Button` | `ghost` with `--danger` text |
| Text field | `Input` | `--sunken` fill, no border, pill radius, 2px `--main` ring on focus |
| Notes | `Textarea` | `--sunken` fill, `--radius-card` |
| Currency | `Select` | Styled like `Input` |
| Category tiles (trip view filter) | `ToggleGroup` `type="multiple"` | 5-column grid of tiles: icon, label, count; selected → `--main` |
| Category picks (place form) | `ToggleGroup` `type="multiple"` | Pill chips with icon; selected → `--main` |
| Status (Want / Visited / Skipped) | `ToggleGroup` `type="single"` | Three equal pills; selected → `--main` |
| Rating 1–10 | `ToggleGroup` `type="single"` | Ten 30px circles; selected → `--accent`; values below it → `--accent-soft` |
| Status filter (trip view) | `ToggleGroup` `type="single"` | Three pills, To go / Visited / Skipped, each with its count; selected → `--main` |
| Place detail, add or edit stay | `Drawer` | Floating: 8px inset from the screen edges, `--radius-sheet`, grab handle |
| Add or edit place | Full-screen route | Main-colored form header with Cancel, title, and Save |
| Delete trip, delete category | `AlertDialog` | Centered, `--radius-sheet`. Delete trip needs the typed trip name |
| Duplicate link warning | `Alert` | `--accent-soft` fill, `--accent-deep` text, `triangle-alert` icon |
| Error (login, validation) | `Alert` `destructive` | `--danger-soft` fill, `--danger` text |
| Category labels on a place | `Badge` | `secondary` → `--sunken`, `--muted` text |
| Confirmation after an action | `Sonner` toast | `--ink` pill, accent icon, top of screen |
| Bottom navigation | `Tabs` | Floating `--main` bar. Places, Stays, Add, Spending, Trip |
| Setting rows | `Button` `ghost` rows in a group | `--sunken` group, white dividers, chevron for navigation |
| Palette picker | `ToggleGroup` `type="single"` | Two-column options with a two-color swatch; selected → 2px `--ink` ring |

Use plain elements only for layout and text, never for a control that shadcn covers.

## Screens

| Screen | Key rules |
|---|---|
| Login | Main block with the app name. White card with the password field, error alert, and **Sign in**. States: wrong password, rate-limited. |
| Trip view | Header: trip name, date range derived from stays, count of places to go, and a switch-trip button. The current stay line sits inside the header. Below: category tiles, search, the status filter (To go by default), and the place list. |
| Place detail | Drawer: name, badges, Directions (primary) and TikTok (secondary), status, rating, notes, and **Spent here** with a price field, quick amounts (+20k, +30k, +50k, +100k), and the running total for the place. |
| Add or edit place | Form: name, Maps link (duplicate alert below it), source link, categories, notes. |
| Spending | Main block: total, plus a total per day. The list is grouped by day, newest first. Expenses linked to a place show a `map-pin` icon. Quick entry floats above the nav bar and shows the parsed result or the parser error live. |
| Stays | The current stay is a main-colored card. Other stays are sunken cards. Each card shows dates, nights, notes, Directions, and Call host when the notes contain a phone number. |
| Add or edit stay | Drawer. Check-out before check-in shows a field error. |
| Trips | Active trip first, then other trips, each with its palette color as the row icon. **Export all trips** and **Import from a file** sit at the bottom. Import reports what it added in a toast. |
| Trip settings | Name, currency (locked once the trip has expenses, with the reason shown), palette, links to Categories, Switch trip, and Export this trip, then **Delete trip** in its own group. |
| Delete trip | Alert dialog: counts of what gets deleted, an export shortcut, and a typed-name confirmation. **Delete** stays disabled until the name matches. |
| Categories | List of all categories with the place count in the active trip. Other shows a lock icon instead of actions. Delete opens a dialog that says how many places move to Other. |
| First run | Main block "No trips yet", then the create-trip card (name, currency, palette) and **Import from a file**. |

## Formatting

- Amounts: Vietnamese grouping with the currency symbol, for example `559.000 ₫`.
  Short form on compact surfaces: `310k`, `1,5tr`.
- Other currencies use their own locale format and symbol, for example `9,840 ฿`.
- Dates: `Wed, Nov 19` in lists, and `Nov 18 → Nov 21` for stay ranges.
- Copy: sentence case. Buttons name their action: **Add place**, **Sign in**,
  **Delete**. Errors name the problem and the fix.
