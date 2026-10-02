# Brief — replace native dropdowns & date inputs with the design-system components

Project: WagStays at `/Users/gokhan.yildirim/hayvan-bakici-v2/wagstays` (Next.js 16, Tailwind v3, see `README.md`).
Dev server runs at http://localhost:3100 (don't start/stop it). Don't run the seed / migrate reset.

**Problem (from the product owner):** native `<select>` menus open the OS (macOS) menu, which doesn't match the
design, and the home page date popover gets clipped by an `overflow-hidden` parent. Every dropdown and date field
on the site must look and behave the same, in the Warm Paw design language.

## Components to use (already built — read them first, don't edit them; report needed changes)
- `src/components/forms/Select.tsx` → `<Select options value|defaultValue onChange name placeholder className variant aria-label renderValue panelMinWidth align disabled />`
  - Options: `{ value, label, hint?, icon?, group?, disabled? }` (group = heading like `<optgroup>`).
  - `name` posts the value through a hidden input, so it works in GET filter forms and server-action forms unchanged.
  - Default trigger style = `SELECT_FIELD` (from `src/components/forms/styles.ts`, also re-exported as `SELECT` in `ui.tsx`).
    Pass `className` to keep a call site's existing trigger look (e.g. `bg-surface-container border-0 …`). The chevron
    icon is added for you — remove the old hand-made `expand_more`/`keyboard_arrow_down` icon spans next to selects.
  - `variant="overlay"`: invisible trigger stretched over the nearest `relative` parent — use it where a tile renders its own
    label (search top bar tiles, the sort pill if needed). The panel anchors to that parent.
  - It's a client component: server pages can render it directly (props are plain data).
- `src/components/forms/DatePicker.tsx`:
  - `<DatePicker name value|defaultValue onChange min max aria-label className format />` — single date, posts `YYYY-MM-DD`.
  - `<DateRangePicker startName endName start/end|defaultStart/defaultEnd onChange min aria-label unitLabel />`.
  - `<RangePanel anchor open onClose start end min onChange unitLabel title />` — the range popover alone, for custom tiles
    (home search "Dates" tile, search top bar "Date range" tile): keep the tile button as the anchor, replace the old inline
    popover with `<input type="date">`s by `RangePanel`.
  - `<DateTimePicker name defaultValue min aria-label />` — posts `YYYY-MM-DDTHH:mm` (old datetime-local format).
  - `Calendar`, `formatIsoDate`, `formatIsoRange`, `toIso`, `fromIso` helpers.
- `src/components/forms/Popover.tsx` — portal popover (never clipped, flips above when needed). Use it for any other custom
  popover you touch that currently gets clipped.
- Reference look: `http://localhost:3100/dev/forms`.

## Rules
- Replace **every** `<select>`, `<input type="date">`, `<input type="datetime-local">`, `<input type="time">` and
  `<datalist>` in your files. Keep the same field `name`s / values so server actions and search params keep working.
- Keep each call site's surrounding layout, label and spacing. Option labels stay the same text; add fitting Material icons
  where it helps (services, sort, status) but don't overdo it.
- Controlled selects whose `onChange` read `e.target.value` → `onChange={(v) => …}`.
- Forms that track completeness/dirty state via `onChange`/`onInput` on the `<form>`: Select dispatches bubbling `input` and
  `change` events from its hidden input — verify the tracker still updates; otherwise call the tracker from `onChange`.
- Keyboard: Tab to the trigger, Enter/Space/ArrowDown opens, arrows move, Enter selects, Esc closes.
- Only edit the files listed in your task. `npx tsc --noEmit` + `npx eslint <your files>` clean.
- Verify with Playwright (scratchpad dir `/private/tmp/claude-504/-Users-gokhan-yildirim-hayvan-bakici-v2/b2d2252e-e30f-460d-887f-3f19eaa21a3a/scratchpad`,
  screenshot helper `shot.js`, `LOGIN=<email>` env for logged-in pages; passwords in `.demo-credentials`, accounts
  emily@wagstays.ca / sarah-mitchell@wagstays.ca / admin@wagstays.ca): open each migrated dropdown/date picker, take a
  screenshot with it open (1440 and 390 wide), pick a value and confirm the form/URL/server action still receives it.
  Restore any demo data you change.
- Final report: files changed, anything that didn't fit the components.
