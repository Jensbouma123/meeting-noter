export const SIZE_TIERS = ["xxs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const RESPONSIVE_BREAKPOINT_ORDER = ["sm", "md", "lg"];
export function resolveResponsive(size, map) {
    if (typeof size === "string")
        return map[size];
    const parts = map[size.base].split(/\s+/).filter(Boolean);
    for (const breakpoint of RESPONSIVE_BREAKPOINT_ORDER) {
        const tier = size[breakpoint];
        if (tier === undefined)
            continue;
        for (const cls of map[tier].split(/\s+/).filter(Boolean))
            parts.push(`${breakpoint}:${cls}`);
    }
    return parts.join(" ");
}
export const SIZE_LABELS = {
    xxs: "2XS",
    xs: "XS",
    sm: "SM",
    md: "MD",
    lg: "LG",
    xl: "XL",
    "2xl": "2XL",
    "3xl": "3XL",
};
export const CONTROL_HEIGHT = {
    xxs: "h-6",
    xs: "h-7",
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
    xl: "h-14",
    "2xl": "h-16",
    "3xl": "h-18",
};
// Control height in px, parsed from CONTROL_HEIGHT (Tailwind `h-N` = N * 4px) so
// the tier table stays the single source.
const controlHeightPx = (tier) => Number(CONTROL_HEIGHT[tier].slice(2)) * 4;
export const TOUCH_TARGET_MIN_PX = 44;
// Every tier whose control is visually shorter than the 44x44px target
// (WCAG 2.5.5) — derived, so a height change can never desync the list.
// Pair with `touchTargetClass`.
export const TOUCH_TARGET_TIERS = SIZE_TIERS.filter((tier) => controlHeightPx(tier) < TOUCH_TARGET_MIN_PX);
// Expands the hit area to 44x44px on touch devices only, via an invisible
// absolutely-positioned pseudo-element (see .touch-target-44 in globals.css).
// Never changes visual size — safe to apply unconditionally alongside any
// other layout classes.
export const TOUCH_TARGET_CLASS = "touch-target-44";
export function needsTouchTarget(size) {
    return TOUCH_TARGET_TIERS.includes(size);
}
export function touchTargetClass(size) {
    return needsTouchTarget(size) ? TOUCH_TARGET_CLASS : undefined;
}
// Same scale as CONTROL_HEIGHT, kept as a literal record (rather than
// derived via string replacement) so Tailwind's JIT scanner can see the
// class names — used to make icon-only buttons square.
export const CONTROL_WIDTH = {
    xxs: "w-6",
    xs: "w-7",
    sm: "w-8",
    md: "w-10",
    lg: "w-12",
    xl: "w-14",
    "2xl": "w-16",
    "3xl": "w-18",
};
export const CONTROL_PADDING_X = {
    xxs: "px-2",
    xs: "px-2.5",
    sm: "px-3",
    md: "px-4",
    lg: "px-5",
    xl: "px-6",
    "2xl": "px-7",
    "3xl": "px-8",
};
export const CONTROL_GAP = {
    xxs: "gap-1",
    xs: "gap-1",
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2",
    xl: "gap-2.5",
    "2xl": "gap-3",
    "3xl": "gap-3.5",
};
export const CONTROL_RADIUS = {
    xxs: "rounded-md",
    xs: "rounded-md",
    sm: "rounded-lg",
    md: "rounded-lg",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-xl",
    "3xl": "rounded-2xl",
};
export const TEXT_SIZE_TIERS = [
    "3xs",
    "xxs",
    "xs",
    "sm",
    "md",
    "lg",
    "xl",
    "2xl",
    "3xl",
];
export const TEXT_SIZE = {
    "3xs": "text-[10px]",
    xxs: "text-[11px]",
    xs: "text-xs",
    sm: "text-[13px]",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-xl",
    "3xl": "text-2xl",
};
// Full icon diameter, independent of the stroke-weight scaling below.
export const ICON_SIZE_CLASS = {
    xxs: "size-3",
    xs: "size-3.5",
    sm: "size-4",
    md: "size-4",
    lg: "size-[18px]",
    xl: "size-5",
    "2xl": "size-6",
    "3xl": "size-7",
};
// Linear stroke-weight ramp from 2.5px (xxs) down to 1px (3xl) — thinner
// strokes read correctly at large sizes, heavier ones stay legible when tiny.
export const ICON_STROKE_WIDTH = {
    xxs: 2.5,
    xs: 2.25,
    sm: 2,
    md: 1.75,
    lg: 1.5,
    xl: 1.5,
    "2xl": 1.25,
    "3xl": 1,
};
// Combines ICON_SIZE_CLASS + ICON_STROKE_WIDTH into one descendant-selector
// className, so any lucide icon nested under it (as a leadingIcon/trailingIcon,
// a Badge child, etc.) scales automatically regardless of the className the
// caller passed to the icon itself. Tailwind's JIT scanner only picks up
// literal class text, so these stay hand-written strings rather than being
// built from the records above.
export const ICON_SCALE_CLASS = {
    xxs: "[&_svg]:size-3 [&_svg]:[stroke-width:2.5]",
    xs: "[&_svg]:size-3.5 [&_svg]:[stroke-width:2.25]",
    sm: "[&_svg]:size-4 [&_svg]:[stroke-width:2]",
    md: "[&_svg]:size-4 [&_svg]:[stroke-width:1.75]",
    lg: "[&_svg]:size-[18px] [&_svg]:[stroke-width:1.5]",
    xl: "[&_svg]:size-5 [&_svg]:[stroke-width:1.5]",
    "2xl": "[&_svg]:size-6 [&_svg]:[stroke-width:1.25]",
    "3xl": "[&_svg]:size-7 [&_svg]:[stroke-width:1]",
};
// Input.tsx: base horizontal padding when no icon occupies that side.
export const INPUT_PADDING_X = {
    xxs: "px-1.5",
    xs: "px-2",
    sm: "px-2.5",
    md: "px-3",
    lg: "px-3.5",
    xl: "px-4",
    "2xl": "px-4.5",
    "3xl": "px-5",
};
// Input.tsx: absolute inset for the leading/trailing icon slot — matches
// INPUT_PADDING_X so the icon sits flush with where the unadorned padding
// would otherwise start.
export const INPUT_ICON_INSET = {
    xxs: "left-1.5",
    xs: "left-2",
    sm: "left-2.5",
    md: "left-3",
    lg: "left-3.5",
    xl: "left-4",
    "2xl": "left-4.5",
    "3xl": "left-5",
};
export const INPUT_ICON_INSET_TRAILING = {
    xxs: "right-1.5",
    xs: "right-2",
    sm: "right-2.5",
    md: "right-3",
    lg: "right-3.5",
    xl: "right-4",
    "2xl": "right-4.5",
    "3xl": "right-5",
};
// Input.tsx: extra padding on the icon side = inset + icon width + a comfortable gap,
// so text and cursor never overlap the icon at any size tier.
export const INPUT_ICON_PADDING_LEADING = {
    xxs: "pl-6",
    xs: "pl-7",
    sm: "pl-8",
    md: "pl-9",
    lg: "pl-10",
    xl: "pl-11",
    "2xl": "pl-12",
    "3xl": "pl-14",
};
export const INPUT_ICON_PADDING_TRAILING = {
    xxs: "pr-6",
    xs: "pr-7",
    sm: "pr-8",
    md: "pr-9",
    lg: "pr-10",
    xl: "pr-11",
    "2xl": "pr-12",
    "3xl": "pr-14",
};
// Input.tsx: three trailing occupants at once (clear + password-reveal + trailingIcon).
// Continues the same per-tier growth as DOUBLE_TRAILING_PADDING's own increment over the
// single-icon padding above, so a third same-sized occupant never clips the input text.
export const TRIPLE_TRAILING_PADDING = {
    xxs: "pr-16",
    xs: "pr-17",
    sm: "pr-20",
    md: "pr-23",
    lg: "pr-26",
    xl: "pr-29",
    "2xl": "pr-32",
    "3xl": "pr-34",
};
// Switch.tsx — thumb diameter is always (track height - 4px), and track
// width is (2 * thumb + 4px), so the thumb has a constant 2px margin on
// every side in both the checked and unchecked positions at every tier.
export const SWITCH_TRACK = {
    xxs: "h-3.5 w-6 p-0.5",
    xs: "h-4 w-7 p-0.5",
    sm: "h-5 w-9 p-0.5",
    md: "h-6 w-11 p-0.5",
    lg: "h-7 w-13 p-0.5",
    xl: "h-8 w-15 p-0.5",
    "2xl": "h-9 w-17 p-0.5",
    "3xl": "h-10 w-19 p-0.5",
};
export const SWITCH_THUMB = {
    xxs: "size-2.5",
    xs: "size-3",
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-8",
    "3xl": "size-9",
};
// Distance the thumb travels when checked to reach the exact right edge with 2px padding
export const SWITCH_THUMB_TRANSLATE = {
    xxs: "translate-x-2.5",
    xs: "translate-x-3",
    sm: "translate-x-4",
    md: "translate-x-5",
    lg: "translate-x-6",
    xl: "translate-x-7",
    "2xl": "translate-x-8",
    "3xl": "translate-x-9",
};
// Tabs.tsx
export const TAB_LIST_PADDING = {
    xxs: "p-0.5",
    xs: "p-0.5",
    sm: "p-1",
    md: "p-1",
    lg: "p-1.5",
    xl: "p-1.5",
    "2xl": "p-2",
    "3xl": "p-2",
};
export const TAB_LIST_GAP = {
    xxs: "gap-0.5",
    xs: "gap-0.5",
    sm: "gap-1",
    md: "gap-1",
    lg: "gap-1.5",
    xl: "gap-1.5",
    "2xl": "gap-2",
    "3xl": "gap-2",
};
export const TAB_RADIUS = {
    xxs: "rounded",
    xs: "rounded-md",
    sm: "rounded-md",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-xl",
    "3xl": "rounded-xl",
};
export const TAB_PADDING = {
    xxs: "px-1.5 py-0.5",
    xs: "px-2 py-1",
    sm: "px-2.5 py-1",
    md: "px-3 py-1.5",
    lg: "px-3.5 py-1.5",
    xl: "px-4 py-2",
    "2xl": "px-5 py-2",
    "3xl": "px-6 py-2.5",
};
// Slider.tsx
export const SLIDER_TRACK_HEIGHT = {
    xxs: "h-1",
    xs: "h-1",
    sm: "h-1.5",
    md: "h-1.5",
    lg: "h-2",
    xl: "h-2",
    "2xl": "h-2.5",
    "3xl": "h-3",
};
export const SLIDER_THUMB_SIZE = {
    xxs: "size-3",
    xs: "size-3.5",
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-8",
    "3xl": "size-9",
};
// The painted thumb is smaller than the SC 2.5.8 24x24 floor below `lg`, so the
// `role="slider"` element it lives in is sized from this scale instead - the
// per-tier maximum of SLIDER_THUMB_SIZE and TARGET_MIN. Every pointer input is
// covered, not just coarse ones, which is what SC 2.5.8 asks for; `touch-target-44`
// still layers the wider AAA 2.5.5 area on top for coarse pointers.
export const SLIDER_THUMB_TARGET = {
    xxs: "size-6",
    xs: "size-6",
    sm: "size-6",
    md: "size-6",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-8",
    "3xl": "size-9",
};
// Height of the pointer-event-owning row, matched to the thumb diameter so
// the thumb is never clipped by its own hit area.
export const SLIDER_ROW_HEIGHT = {
    xxs: "h-3",
    xs: "h-3.5",
    sm: "h-4",
    md: "h-5",
    lg: "h-6",
    xl: "h-7",
    "2xl": "h-8",
    "3xl": "h-9",
};
// Badge.tsx
export const BADGE_PADDING = {
    xxs: "px-1.5 py-0.5",
    xs: "px-2 py-0.5",
    sm: "px-2 py-0.5",
    md: "px-2.5 py-0.5",
    lg: "px-3 py-1",
    xl: "px-3.5 py-1",
    "2xl": "px-4 py-1.5",
    "3xl": "px-5 py-2",
};
export const BADGE_TEXT = {
    // 11px is the floor at the small tiers: no control or badge label renders
    // below it, matching `AccivaControlText` (the Button's `TEXT_SIZE.xxs`).
    xxs: "text-[11px]",
    xs: "text-[11px]",
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-[13px]",
    xl: "text-sm",
    "2xl": "text-base",
    "3xl": "text-lg",
};
export const BADGE_GAP = {
    xxs: "gap-0.5",
    xs: "gap-0.5",
    sm: "gap-1",
    md: "gap-1",
    lg: "gap-1.5",
    xl: "gap-1.5",
    "2xl": "gap-2",
    "3xl": "gap-2",
};
// Floor height for a docs/demo stage that must not collapse before its content
// loads. Every stop is an exact multiple of Tailwind's spacing unit, so the six
// arbitrary `min-h-[Npx]` stages in the app each land on a tier unchanged:
// 120px -> xs, 160px -> sm, 380px -> xl, 580px -> 2xl, 640px -> 3xl.
export const PREVIEW_MIN_HEIGHT = {
    xxs: "min-h-24",
    xs: "min-h-30",
    sm: "min-h-40",
    md: "min-h-60",
    lg: "min-h-80",
    xl: "min-h-95",
    "2xl": "min-h-145",
    "3xl": "min-h-160",
};
export const BADGE_ICON_SCALE_CLASS = {
    xxs: "[&_svg]:size-2 [&_svg]:[stroke-width:2.5]",
    xs: "[&_svg]:size-2.5 [&_svg]:[stroke-width:2.25]",
    sm: "[&_svg]:size-2.5 [&_svg]:[stroke-width:2]",
    md: "[&_svg]:size-3 [&_svg]:[stroke-width:1.75]",
    lg: "[&_svg]:size-3.5 [&_svg]:[stroke-width:1.5]",
    xl: "[&_svg]:size-4 [&_svg]:[stroke-width:1.5]",
    "2xl": "[&_svg]:size-4.5 [&_svg]:[stroke-width:1.25]",
    "3xl": "[&_svg]:size-5 [&_svg]:[stroke-width:1]",
};
