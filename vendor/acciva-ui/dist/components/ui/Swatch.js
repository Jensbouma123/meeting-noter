import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatColor, parseColor } from "../../lib/color/formats/index.js";
import { cn } from "../../lib/utils.js";
export const SWATCH_SIZE_CLASS = {
    xs: "size-4",
    sm: "size-5",
    md: "size-6",
    lg: "size-8",
};
function serializedColor(color) {
    const rgba = parseColor(color);
    return rgba ? formatColor(rgba, "rgb") : null;
}
function warnInvalid(color) {
    if (process.env.NODE_ENV !== "production") {
        console.error(`[a11y] <Swatch> received an unparseable \`color\` ("${color}"); rendering a dashed placeholder. Pass a parseColor input (#rgb, #rrggbb, rgb(), hsl(), oklch()) (WCAG 2.2 AA SC 1.1.1 Non-text Content).`);
    }
}
export function Swatch({ color, label, size = "md", className, ...rest }) {
    const fill = serializedColor(color);
    if (fill === null)
        warnInvalid(color);
    const labelled = label !== undefined && label.trim() !== "";
    return (_jsx("span", { ...(labelled ? { role: "img", "aria-label": label } : { "aria-hidden": true }), ...rest, style: { ...rest.style, backgroundColor: fill ?? undefined }, className: cn("inline-block shrink-0 rounded-full border", SWATCH_SIZE_CLASS[size], fill === null ? "border-dashed border-border bg-transparent" : "border-border", className) }));
}
export function LegendItem({ color, label, caption, size = "md", className, ...rest }) {
    const trimmed = label?.trim();
    const name = trimmed ? `${trimmed}, ${caption}` : caption;
    return (_jsxs("span", { role: "img", "aria-label": name, ...rest, className: cn("inline-flex min-w-0 items-center gap-2", className), children: [_jsx(Swatch, { color: color, size: size, "aria-hidden": "true" }), _jsx("span", { "aria-hidden": "true", className: "truncate text-sm text-foreground", children: caption })] }));
}
