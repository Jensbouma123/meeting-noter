var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatColor, parseColor } from "../../lib/color/formats.js";
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
export function Swatch(_a) {
    var { color, label, size = "md", className } = _a, rest = __rest(_a, ["color", "label", "size", "className"]);
    const fill = serializedColor(color);
    if (fill === null)
        warnInvalid(color);
    const labelled = label !== undefined && label.trim() !== "";
    return (_jsx("span", Object.assign({}, (labelled ? { role: "img", "aria-label": label } : { "aria-hidden": true }), rest, { style: Object.assign(Object.assign({}, rest.style), { backgroundColor: fill !== null && fill !== void 0 ? fill : undefined }), className: cn("inline-block shrink-0 rounded-full border", SWATCH_SIZE_CLASS[size], fill === null ? "border-dashed border-border bg-transparent" : "border-border", className) })));
}
export function LegendItem(_a) {
    var { color, label, caption, size = "md", className } = _a, rest = __rest(_a, ["color", "label", "caption", "size", "className"]);
    const trimmed = label === null || label === void 0 ? void 0 : label.trim();
    const name = trimmed ? `${trimmed}, ${caption}` : caption;
    return (_jsxs("span", Object.assign({ role: "img", "aria-label": name }, rest, { className: cn("inline-flex min-w-0 items-center gap-2", className), children: [_jsx(Swatch, { color: color, size: size, "aria-hidden": "true" }), _jsx("span", { "aria-hidden": "true", className: "truncate text-sm text-foreground", children: caption })] })));
}
