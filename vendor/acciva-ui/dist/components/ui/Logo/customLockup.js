import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { getDimensions, resolveHeight } from "./geometry.js";
import { WordmarkText } from "./LogoParts.js";
export function renderCustomLockup(variant, size, mark, src, ariaLabel, isAriaHidden, className, rest) {
    const height = resolveHeight(size);
    const wordmarkDim = getDimensions("wordmark", size);
    const markElement = mark ? (_jsx("span", { "aria-hidden": "true", className: "inline-flex items-center justify-center shrink-0", children: mark })) : (
    // eslint-disable-next-line @next/next/no-img-element
    _jsx("img", { src: src, alt: "", "aria-hidden": "true", width: height, height: height, className: "h-full w-auto object-contain shrink-0" }));
    return (_jsxs("span", { role: isAriaHidden ? undefined : "img", "aria-label": isAriaHidden ? undefined : ariaLabel, "aria-hidden": isAriaHidden ? "true" : undefined, className: cn("inline-flex items-center gap-2 shrink-0", className), ...rest, children: [markElement, _jsx("svg", { width: wordmarkDim.width, height: wordmarkDim.height, viewBox: wordmarkDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: cn("shrink-0", variant === "responsive" && "hidden sm:inline-block"), children: _jsx(WordmarkText, { x: 0 }) })] }));
}
