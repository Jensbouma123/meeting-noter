import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { getDimensions } from "./geometry.js";
import { PrismMonogram, WordmarkText } from "./LogoParts.js";
export function renderBuiltIn(variant, size, ariaLabel, className, rest) {
    if (variant === "responsive") {
        const markDim = getDimensions("mark", size);
        const fullDim = getDimensions("full", size);
        return (_jsxs("span", { role: "img", "aria-label": ariaLabel, className: cn("inline-flex items-center shrink-0", className), ...rest, children: [_jsx("svg", { width: markDim.width, height: markDim.height, viewBox: markDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: "sm:hidden shrink-0", children: _jsx(PrismMonogram, {}) }), _jsxs("svg", { width: fullDim.width, height: fullDim.height, viewBox: fullDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: "hidden sm:inline-block shrink-0", children: [_jsx(PrismMonogram, {}), _jsx(WordmarkText, { x: 40 })] })] }));
    }
    const { width, height, viewBox } = getDimensions(variant, size);
    return (_jsxs("svg", { width: width, height: height, viewBox: viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-label": ariaLabel, className: cn("shrink-0", className), ...rest, children: [variant === "mark" && _jsx(PrismMonogram, {}), variant === "wordmark" && _jsx(WordmarkText, { x: 0 }), variant === "full" && (_jsxs(_Fragment, { children: [_jsx(PrismMonogram, {}), _jsx(WordmarkText, { x: 40 })] }))] }));
}
