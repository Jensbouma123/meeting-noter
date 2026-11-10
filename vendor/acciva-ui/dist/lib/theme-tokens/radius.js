export const RADIUS_MAP = {
    none: { rem: "0rem", label: "Sharp", px: "0px" },
    xs: { rem: "0.25rem", label: "XS", px: "4px" },
    sm: { rem: "0.375rem", label: "SM", px: "6px" },
    md: { rem: "0.5rem", label: "MD (Default)", px: "8px" },
    lg: { rem: "0.75rem", label: "LG", px: "12px" },
    xl: { rem: "1.0rem", label: "XL", px: "16px" },
    "2xl": { rem: "1.5rem", label: "2XL", px: "24px" },
    full: { rem: "9999px", label: "Pill / Full", px: "9999px" },
};
export const DEFAULT_RADIUS = "md";
/** The single length every `rounded-*` utility is a multiple of. */
export const RADIUS_BASE_VARIABLE = "--radius-base";
/**
 * Tailwind's own radius namespace, re-expressed as multiples of the base so the
 * whole scale moves together when the base does. At the default `md` base
 * (0.5rem) every step lands on the exact value Tailwind ships, so re-deriving
 * the scale is invisible until the user actually moves it. `--radius` is the
 * bare `rounded` utility; `rounded-full` stays a pill and is not on the scale.
 */
export const RADIUS_STEP_RATIOS = [
    ["--radius", 0.5],
    ["--radius-xs", 0.25],
    ["--radius-sm", 0.5],
    ["--radius-md", 0.75],
    ["--radius-lg", 1],
    ["--radius-xl", 1.5],
    ["--radius-2xl", 2],
    ["--radius-3xl", 3],
    ["--radius-4xl", 4],
];
export function radiusVariables() {
    return RADIUS_STEP_RATIOS.map(([name, ratio]) => ({
        name,
        value: ratio === 1
            ? `var(${RADIUS_BASE_VARIABLE})`
            : `calc(var(${RADIUS_BASE_VARIABLE}) * ${ratio})`,
    }));
}
