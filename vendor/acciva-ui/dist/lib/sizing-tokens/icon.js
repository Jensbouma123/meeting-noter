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
