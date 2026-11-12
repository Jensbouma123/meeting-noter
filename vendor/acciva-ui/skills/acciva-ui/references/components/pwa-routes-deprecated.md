## PWA hooks and the safe area

Not components — the three client hooks and the safe-area utility layer a
standalone/installed build needs. Full contract in
[.agents/pwa.md](../../../../.agents/pwa.md).

### PWA hooks
- **Import:** `import { useStandalone, useInstallPrompt, useServiceWorkerUpdate } from "@/hooks"`
- **Category:** Hook
- **Purpose:** `useStandalone()` reports whether the app is running installed. `useInstallPrompt()` drives an install affordance — branch on `method`: `prompt` (a real `beforeinstallprompt` is held), `instructions` (show the platform's manual steps), `unavailable` (render nothing). `useServiceWorkerUpdate()` surfaces a waiting worker; call its `applyUpdate()` from a user gesture only.
- **Gotcha:** all three are client-only — they never run in a server component.

### Safe area
- **Import:** none — 29 `@utility` classes in `src/styles/base/*.css` (via `src/styles/base.css`, pulled in by `src/styles/tokens.css`)
- **Category:** Utility
- **Purpose:** `p*-safe`, `m*-safe`, `inset*-safe`, `top/right/bottom/left-safe`, `h-safe-top`/`h-safe-bottom`, `min-h-screen-safe`, plus the bottom-nav-aware `h-safe-nav`, `pb-safe-nav`, `mb-safe-nav`, `bottom-safe-nav` and `scroll-pb-safe-nav`.
- **Gotcha:** never write `env(safe-area-inset-*)` in a component. `base.css` is the one place those are read; a component that reaches for `env()` directly bypasses the bottom-nav composition and drifts from the token layer.

---

## App routes (reachable by URL, not by import)

Not components. Nothing here is exported from the package, so there is no import to
route a task to — the entry is here so a task about theming lands on the right surface
instead of a component that only looks adjacent.

### Color Studio
- **Route:** `/color-studio` (`src/app/color-studio/`)
- **Category:** App flow
- **Purpose:** Build a shippable theme from one seed colour in **two steps** — `Seed`
  (seed hex + harmony, with the primary/accent/secondary ramps and a light/dark seed
  swatch) and `Review & Export` (both modes' component previews, apply the theme to the
  running app or reset it, and the emitted Tailwind / CSS-variable / DTCG files, Tailwind
  first). Light and dark are always auto-derived and every non-converged role is split per
  mode automatically, so the theme clears WCAG 2.2 AA with no human input and there is no
  gate to clear.
- **Gotcha:** for a theme with no UI at all, call `generateTheme(seed, { harmony })` or the
  CLI instead — see [Generating a Theme from a Brand Seed](../theme.md). The studio is the
  same engine path with previews on it, not a second implementation. The WCAG audit lives
  behind the collapsed `Accessibility report` disclosure and is informational only.
- **Spec:** `.agents/components/ColorStudio.md`

---

## Deprecated prop names

Every row below still works — nothing breaks — but the replacement is the name to write in
new code. Where both are set, the replacement wins.

| Component | Deprecated | Use instead |
|---|---|---|
| `Pagination` | `ariaLabel` | `aria-label` |
| `NavTree` | `ariaLabel` | `aria-label` |
| `DataList` | `ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` | `aria-label` / `aria-labelledby` / `aria-describedby` |
| `VirtualList` | `label` / `labelledBy` / `describedBy` | `aria-label` / `aria-labelledby` / `aria-describedby` |
| `ScrollView` | `label` | `aria-label` |
| `Card` | `interactive` (boolean) | `variant="interactive"` |
| `Radio` (in `RadioGroup`) | `card` | `variant="card"` |
| `EmptyState` | `compact` | `size="sm"` |
| `DropdownMenuItem` | `destructive` | `variant="danger"` |
| `Heading` | `color` | `variant` |

Two conventions drive the list: accessible names are always the kebab-case JSX spellings
(`aria-label`, `aria-labelledby`, `aria-describedby`), and a flag that changes a
component's DOM shape, semantics, or whole visual tier is a `variant`/`size`, never a
boolean (see `.agents/components.md`).

### Removed (does not still work)

| Component | Removed | Use instead |
|---|---|---|
| `ScrollView` | `wrapAt="xs"` | `wrapAt="sm"` |

`wrapAt="xs"` built its classes from `xs:flex-wrap` / `xs:hidden`, and this system
registers no `--breakpoint-xs` — the breakpoint scale is Tailwind's default and starts at
`sm`, while `xs` names a *size* tier here. Those classes compiled to nothing, so the value
had never wrapped anything; `sm` is the nearest working breakpoint. Base (unprefixed)
styles are already the phone-portrait case, so "wrap on the smallest viewport" is a base
`flex-wrap`, not a breakpoint override.

`Checkbox` also changed behaviour without changing its prop list: `className` now merges
onto the root `<label>` — it used to land on the label text span and vanish entirely when
`label` was omitted. Use the new `labelClassName` to style the label text.

Deep imports: `@jensbouma123/acciva-ui/ui/<Name>` and `/blocks/<Name>` resolve to
`dist/components/<layer>/<Name>/index.js` (single-file components get a shim at build).
