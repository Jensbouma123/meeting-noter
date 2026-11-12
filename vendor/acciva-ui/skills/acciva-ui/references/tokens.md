# ACCIVA-UI Design Tokens & Theming Reference

ACCIVA-UI is strictly token-driven. Hand-picked hex codes, arbitrary pixels, and ad-hoc colors are forbidden in components.

To generate the token set from a brand seed, follow [Generating a Theme from a Brand Seed](./theme.md). The tool takes the seed it is given and never changes its hue; a seed that cannot carry every role must be reported back to the human or replaced with one the human approves.

---

## 1. Semantic Surface & Canvas Roles

| Token Role | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--color-background` / `bg-background` | OKLCH Canvas base (0.93) | OKLCH Canvas base (0.14) | Page body / canvas |
| `--color-surface` / `bg-surface` | OKLCH Surface (0.96) | OKLCH Surface (0.17) | Card / panel background |
| `--color-foreground` / `text-foreground` | OKLCH (0.22) | OKLCH (0.94) | Primary body text |
| `--color-muted-foreground` / `text-muted-foreground` | OKLCH (0.42) | OKLCH (0.82) | Helper text / captions |
| `--color-border` / `border-border` | OKLCH (0.85) | OKLCH (0.30) | Component dividers / outlines |
| `--color-focus-ring` / `ring-focus-ring` | Solved focus role (0.50) | Solved focus role (0.78) | `:focus-visible` indicators (3:1 contrast) |

---

## 2. Elevation Tokens

Elevations provide depth without harsh arbitrary drop-shadows:
- `elevation-0` — Flush with page canvas (transparent / base)
- `elevation-1` — Subtle elevated cards and panels
- `elevation-2` — Floating dropdowns and popovers
- `elevation-3` — Sticky navigation headers and drawer panels
- `elevation-4` — Modal dialogs and critical overlays

---

## 3. Semantic Palette Scales

Each palette is a 26-step OKLCH ramp (50 through 950):
- **`primary-*`** — Brand actions, active states, key CTAs.
- **`secondary-*`** — Neutral supporting actions, secondary buttons.
- **`accent-*`** — Highlights, badges, decorative accents.
- **`neutral-*`** — Grays, borders, subtle hover surfaces.
- **`success-*`** — Success confirmation states, positive trends.
- **`warning-*`** — Caution states, non-blocking alert banners.
- **`danger-*`** — Error messages, destructive action triggers.
- **`info-*`** — Informational guidance banners, help notes.

---

## 4. Radius & Sizing Scaling

```css
/* All border radii compute dynamically from --radius-base: */
--radius-xs:  calc(var(--radius-base) * 0.25);
--radius-sm:  calc(var(--radius-base) * 0.5);
--radius-md:  calc(var(--radius-base) * 0.75);
--radius-lg:  var(--radius-base);
--radius-xl:  calc(var(--radius-base) * 1.5);
--radius-2xl: calc(var(--radius-base) * 2);
```

---

## 5. Touch Target Contract

- **Minimum Size:** Any touch-interactive element must clear `44px x 44px` on touch screens.
- **Small Controls:** Use the `.touch-target-44` utility on smaller button sizes (xs, xxs) to expand the hit area pseudo-element without visually stretching the component.

## 6. Motion

- **Web durations:** `feedback` 140ms (hover departs), `feedback-in` 70ms (hover arrives), `spatial` 180ms fine-pointer / 260ms coarse-pointer, eases `standard` / `emphasized` / `sheet`. Under `prefers-reduced-motion: reduce` all durations collapse to `0ms` (WCAG 2.2 SC 2.3.3).
- **Apple springs** (`AccivaTokens.Motion`, `apple/Sources/AccivaUI/Support/Motion.swift`): `layout` = `.smooth`, `control`/`selection` = `.snappy`, `morph` = `.bouncy(duration: spatial × 2, extraBounce: 0)` for glass morph / matched-geometry transitions. All three ship on the package floor (iOS 17 / macOS 14 / visionOS 1), no `#available` gate.
- **Apple Reduce Motion:** `AccivaTokens.Motion.animation(_:reduceMotion:)` returns `nil` when Reduce Motion is on so the change applies instantly (SC 2.3.3). `AccivaTokens.Motion.morphTransition(reduceMotion:)` is the `AnyTransition` for an inserted glass item: a fade + materialising scale by default, collapsing to an opacity crossfade under Reduce Motion (SC 2.3.3 — opacity is not motion). `AccivaTokens.Motion.insert(reduceMotion:)` is the asymmetric insert/removal pair: insertion uses `morphTransition`, removal is opacity-only (opacity both ways under Reduce Motion). Opacity-only fades are exempt — keep the `feedback` easeOut. Curve-based press feedback uses `AccivaControlState.pressAnimation(reduceMotion:)`.

## ThemeProvider stylesheet and palette props

`ThemeProvider` never runs the OKLCH solver at mount: while the active seed/harmony are the ones the page's stylesheet declares (the default theme, or the `stylesheet` prop) it trusts the CSS variables. It builds a palette lazily, only when the theme changes after mount or `useTheme().tokens` (a memoized getter) is read. For a custom seed, render the stylesheet on the server and declare it: `import { ThemeProvider, themeStylesheet } from "acciva-ui/theme"`, then `<style>{themeStylesheet(seed, harmony)}</style>` in the root layout and `<ThemeProvider stylesheet={{ seed, harmony }}>` (import `acciva-ui/styles/base` in app CSS; `themeStylesheet` omits its `@import`). `<ThemeProvider palette={buildAppPalette(seed, harmony)}>` still works and is used while its seed/harmony match the active ones.

## 6. Liquid Glass tint (Apple-only)

- **Tint opacity:** `AccivaTokens.Glass.tint(colorScheme)` — 0.10 light / 0.15 dark — delegates to `Opacity.tintFill`, so both platforms read one table (`TINT_FILL_OPACITY` in `src/lib/opacity-tokens.ts`).
- **Full tint:** `AccivaTokens.Glass.prominentTint` (`1`) — the `.prominent` (brand green) and `.accent` (plum) glass recipe, mirroring the solid opaque fills.
- **Accent role:** plum (`buttonAccentBackground`/`buttonAccentForeground`) is secondary emphasis for AI/agent-generated content, never a primary action. White on opaque plum measures **5.39:1 in both modes** (SC 1.4.3), so `.accent` glass fills at full tint; a `tintFill` wash would measure **1.27:1 in light mode** and fail — that recipe is banned for white labels. Full contract in [Glass](../../../.agents/components/Glass.md).
- **On-glass text** (`apple/Sources/AccivaUI/Support/OnGlass.swift`): `AccivaTokens.Colors.foregroundOnGlass` (= `foreground`) and `mutedOnGlass` (= `mutedForeground`) — the only text roles for surface-based glass fills (`chrome`/`control`/`selected`/`status`/`identity`). Both clear 4.5:1 (SC 1.4.3) on every such fill in every appearance (worst measured: muted on `status(danger)` light, **6.43:1**; foreground everywhere ≥ **12.18:1**). `prominent`/`accent` keep white labels (4.77:1 / 5.39:1) — no dark text passes on opaque brand/plum (black on brand is 4.40:1). Separate roles, not bare `foreground` at call sites, so the glass guarantee can evolve without touching content text; a failing pair moves the on-glass role, never the threshold.
- **Contrast helper:** `AccivaContrast.ratio(_:on:tint:tintOpacity:scheme:contrast:)` — WCAG 2.2 ratio of a text role over a tinted fill, reusing `OnHue` maths; the `on: AccivaGlassRole` overload derives the fill from the role's solid branch. Pass `Glass.tint(scheme)` as the opacity, never a literal. Custom identity hues owe their own proof via this helper. Full per-pair matrix in `apple/Tests/AccivaUITests/GlassContrastTests/`.
