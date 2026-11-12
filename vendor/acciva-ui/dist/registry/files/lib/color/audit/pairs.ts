import { BORDER_PAIRS } from "@/lib/color/audit/pair-border";
import { BRAND_PAIRS, HEADING_PAIRS } from "@/lib/color/audit/pair-brand";
import { FOCUS_PAIRS } from "@/lib/color/audit/pair-focus";
import { statusPairs } from "@/lib/color/audit/pair-status";
import { DISABLED_PAIRS, TEXT_PAIRS } from "@/lib/color/audit/pair-text";
import type { RequiredPair } from "@/lib/color/audit/types";

/**
 * Every role pair a theme must clear to conform to WCAG 2.2 AA, in both modes.
 *
 * A given (foreground, background) role pair appears **once**, at the strictest
 * use that applies to it — a pair held to 4.5:1 as body text passes the 3:1
 * non-text floor by construction, so listing it twice would only inflate the
 * table.
 *
 * This table supersedes `PAIR_SPECS` / `ROLE_THRESHOLDS` in
 * `src/lib/theme-tokens.ts` and deliberately diverges from it in four places:
 *
 * - **Borders are 3:1, not 1.8:1.** `ROLE_THRESHOLDS.border.aa.ratio` is 1.8,
 *   which is not a WCAG number. SC 1.4.11 requires 3:1 for the boundary of a
 *   UI component. The border roles are split by function instead of relaxed:
 *   `border.default` and `border.strong` delimit controls and are gated at 3:1;
 *   `border.subtle` is a hairline separator — neither a control boundary nor a
 *   graphical object needed to understand content — so it is listed as
 *   `decorative`, cites no SC, and is measured but never gated.
 * - **No lightness pass-override.** `theme-tokens.ts` lets a dark border count
 *   as passing when its OKLCH lightness happens to fall in 0.28–0.40,
 *   regardless of the ratio. That fabricates conformance. Here `pass` is
 *   `ratio >= required`, always, with no escape hatch.
 * - **The focus indicator is graded along the whole painted chain**, not only
 *   against the canvas and card surface. SC 2.4.13 requires the indicator to
 *   contrast with adjacent colours, and the control fill it outlines is one of
 *   them. The theme ships a two-tone ring, so that chain is
 *   `fill | border.focusOffset | border.focus | surface` and the adjacencies a
 *   sighted keyboard user can see are fill↔offset, offset↔focus and
 *   focus↔surface. All seven are gated at 3:1, each between the two colours
 *   that actually touch. Grading `border.focus` straight against the fill would
 *   measure an inset ring the theme does not paint, and in dark mode no colour
 *   can satisfy it — see the focus-ring recipe in `.agents/lib/color-engine.md`.
 * - **Info status is covered.** `PAIR_SPECS` has badge pairs for success,
 *   warning and danger but not info; all four are enumerated here.
 *
 * `foreground.disabled` is exempt: SC 1.4.3 and SC 1.4.11 both exclude
 * inactive user interface components, so no AA floor is mandatory. The rows are
 * kept at the 3:1 large-text floor as a house minimum, marked `exempt`, so a
 * designer sees the number without it turning `passesAA` into a stricter
 * verdict than WCAG 2.2 AA actually is.
 */
export const REQUIRED_PAIRS: readonly RequiredPair[] = [
  ...TEXT_PAIRS,
  ...BRAND_PAIRS,
  ...statusPairs("success", "Success"),
  ...statusPairs("warning", "Warning"),
  ...statusPairs("danger", "Danger"),
  ...statusPairs("info", "Info"),
  ...HEADING_PAIRS,
  ...BORDER_PAIRS,
  ...FOCUS_PAIRS,
  ...DISABLED_PAIRS,
];
