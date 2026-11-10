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
