export const APP_PALETTES = ["primary", "secondary", "accent", "neutral"];
/** Tailwind's stop names, lightest first. The app's public palette surface. */
export const TAILWIND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export const HARMONY_MODES = [
    "complementary",
    "analogous",
    "triadic",
    "split-complementary",
    "tetradic",
    "monochromatic",
];
export const DEFAULT_SEED = "#00835b";
export const DEFAULT_HARMONY = "complementary";
/**
 * `500` is the action fill: `Button` variant `primary` paints white text on it,
 * so a lightness alias alone is not enough — the step has to clear WCAG 2.1 AA
 * *and* the APCA body target against white. The action stop is therefore solved
 * rather than looked up, and 600-950 are pushed down the ramp behind it so hover
 * and pressed states stay darker than rest.
 */
export const ACTION_STEP = 500;
export const ACTION_LABEL = "#ffffff";
export const ACTION_USE = "body";
/** The solver never darkens the action fill past what Tailwind would call 800. */
export const ACTION_FLOOR_STEP = 800;
export const STATUS_PALETTES = ["success", "warning", "danger", "info"];
/** The tinted label surfaces: a fill step plus a label step, one per status hue. */
export const BADGE_PALETTES = ["primary", "success", "warning", "danger", "info"];
/** The three fills `Button` paints a white label on. */
export const ACTION_PALETTES = ["primary", "secondary", "accent"];
export const BADGE_LABEL_STEP = { light: 800, dark: 300 };
export const BADGE_FILL_STEP = { light: 100, dark: 950 };
export const LINK_STEP = BADGE_LABEL_STEP;
