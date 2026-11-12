import type { PresetTokenOverrides } from "@/lib/theme-tokens/preset-types";

/**
 * Every role Turf chooses for itself. `--focus-ring-offset` is the one role
 * graded from both sides at once — against each action fill and against the
 * outer ring — so a pinned value can only be right for the fills it was measured
 * against. Light mode's `#f4f9f5` was measured against fills that still hold, so
 * it stands; dark mode has no value that satisfies both sides and omits the key,
 * which hands the role to the solver (`#0d110d`).
 */
export const TURF_SEMANTIC_OVERRIDES: PresetTokenOverrides = {
  light: {
    "--background": "#edf2ed",
    "--surface": "#f4f9f5",
    "--elevation-0": "#edf2ed",
    "--elevation-1": "#f4f9f5",
    "--elevation-2": "#f9fefa",
    "--elevation-3": "#fbfffc",
    "--elevation-4": "#fcfffc",
    "--foreground": "#121512",
    "--surface-foreground": "#121512",
    "--muted-foreground": "#4b4e4b",
    "--subtle-foreground": "#676a67",
    "--border": "#828783",
    "--border-control": "#828783",
    "--border-subtle": "#dadfdb",
    "--focus-ring": "#00791e",
    "--focus-ring-surface": "#00791e",
    "--focus-ring-control": "#00791e",
    "--focus-ring-offset": "#f4f9f5",
    "--button-primary-background": "#008622",
    "--button-secondary-background": "#864300",
    "--button-accent-background": "#7c48d7",
    "--success": "#006946",
    "--warning": "#725200",
    "--danger": "#a80018",
    "--info": "#005d91",
    "--link-foreground": "#006b19",
    "--badge-primary-background": "#beffbf",
    "--badge-primary-foreground": "#005e15",
    "--badge-success-background": "#b3ffd9",
    "--badge-success-foreground": "#005c3d",
    "--badge-warning-background": "#ffe8bf",
    "--badge-warning-foreground": "#644800",
    "--badge-danger-background": "#ffe4e1",
    "--badge-danger-foreground": "#940014",
    "--badge-info-background": "#daeeff",
    "--badge-info-foreground": "#005280",
  },
  dark: {
    "--background": "#171b17",
    "--surface": "#1f2320",
    "--elevation-0": "#171b17",
    "--elevation-1": "#1f2320",
    "--elevation-2": "#272b28",
    "--elevation-3": "#303431",
    "--elevation-4": "#393d3a",
    "--foreground": "#edf1ee",
    "--surface-foreground": "#edf1ee",
    "--muted-foreground": "#bbbfbc",
    "--subtle-foreground": "#9c9f9c",
    "--border": "#747975",
    "--border-control": "#747975",
    "--border-subtle": "#3d413d",
    "--focus-ring": "#56e665",
    "--focus-ring-surface": "#56e665",
    "--focus-ring-control": "#56e665",
    // Two dark-mode departures from the source palette, forced by the sandwich
    // `--focus-ring-offset` sits in: `focus-offset` grades the offset ring
    // against the *tightest* of the three action fills at 3:1, while
    // `focus-control` grades the outer ring against that same offset. The source
    // pinned the fills to `secondary-700` and `accent-600`, which no offset can
    // satisfy from both sides at once. Their own `500` stops can: 3.60:1 and
    // 3.42:1 from the solved offset, 5.28:1 and 5.58:1 under the white label.
    // Nothing lighter survives the label, nothing darker survives the ring — the
    // window is one stop wide.
    "--button-primary-background": "#00791e",
    "--button-secondary-background": "#a75600",
    "--button-accent-background": "#7c48d7",
    "--success": "#00bb80",
    "--warning": "#ca9400",
    "--danger": "#ff635e",
    "--info": "#47a7eb",
    "--link-foreground": "#56e665",
    "--badge-primary-background": "#193d1b",
    "--badge-primary-foreground": "#56e665",
    "--badge-success-background": "#003f29",
    "--badge-success-foreground": "#3de4a3",
    "--badge-warning-background": "#463000",
    "--badge-warning-foreground": "#f8b815",
    "--badge-danger-background": "#532321",
    "--badge-danger-foreground": "#ffaba3",
    "--badge-info-background": "#083756",
    "--badge-info-foreground": "#8eccfc",
  },
};
