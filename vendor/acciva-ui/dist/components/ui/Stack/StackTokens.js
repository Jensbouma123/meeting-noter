// ---------------------------------------------------------------------------
// Lookup tables (token-driven — no ternary class strings)
// ---------------------------------------------------------------------------
/** Gap classes per spacing tier. */
export const SPACING_GAP = {
    none: "gap-0",
    xxs: "gap-0.5",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
    "2xl": "gap-8",
    "3xl": "gap-12",
};
/** Inset (padding) classes per spacing tier. */
export const INSET_PADDING = {
    none: "",
    xxs: "p-0.5",
    xs: "p-1",
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
    xl: "p-6",
    "2xl": "p-8",
    "3xl": "p-12",
};
export const DIRECTION_CLASS = {
    horizontal: "flex-row",
    vertical: "flex-col",
};
// Literal strings so Tailwind's scanner sees every class.
const RESPONSIVE_DIRECTION_CLASS = {
    base: { horizontal: "flex-row", vertical: "flex-col" },
    sm: { horizontal: "sm:flex-row", vertical: "sm:flex-col" },
    md: { horizontal: "md:flex-row", vertical: "md:flex-col" },
    lg: { horizontal: "lg:flex-row", vertical: "lg:flex-col" },
    xl: { horizontal: "xl:flex-row", vertical: "xl:flex-col" },
};
const BREAKPOINTS = Object.keys(RESPONSIVE_DIRECTION_CLASS);
/** Resolves a single or per-breakpoint direction to flex classes (phone default: column). */
export function directionClass(direction) {
    if (typeof direction === "string")
        return DIRECTION_CLASS[direction];
    const classes = BREAKPOINTS.flatMap((bp) => {
        const d = direction[bp];
        return d ? [RESPONSIVE_DIRECTION_CLASS[bp][d]] : [];
    });
    return direction.base ? classes.join(" ") : ["flex-col", ...classes].join(" ");
}
export const ALIGN_CLASS = {
    leading: "items-start",
    center: "items-center",
    trailing: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};
export const JUSTIFY_CLASS = {
    leading: "justify-start",
    center: "justify-center",
    trailing: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
};
