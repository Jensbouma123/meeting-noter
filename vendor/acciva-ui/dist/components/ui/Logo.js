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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from "../../lib/utils.js";
const SIZE_MAP = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
};
function getDimensions(variant, size) {
    var _a;
    const height = typeof size === "number" ? size : (_a = SIZE_MAP[size]) !== null && _a !== void 0 ? _a : 32;
    switch (variant) {
        case "mark":
            return { width: height, height, viewBox: "0 0 32 32" };
        case "wordmark":
            return { width: Math.round(height * (120 / 32)), height, viewBox: "0 0 120 32" };
        case "full":
        case "responsive":
        default:
            return { width: Math.round(height * (160 / 32)), height, viewBox: "0 0 160 32" };
    }
}
function PrismMonogram() {
    return (_jsxs("g", { className: "logo-prism-monogram", children: [_jsx("polygon", { points: "16,3 20,11 16,16 12,11", className: "fill-primary-400" }), _jsx("polygon", { points: "16,3 12,11 16,16 16,13", className: "fill-primary-600", opacity: "0.9" }), _jsx("polygon", { points: "12,11 4,27 10,27 16,16", className: "fill-primary-600" }), _jsx("polygon", { points: "20,11 28,27 22,27 16,16", className: "fill-primary-500" }), _jsx("polygon", { points: "8.5,19 23.5,19 21,24 11,24", className: "fill-primary-400" }), _jsx("polygon", { points: "16,13 13,19 19,19", className: "fill-primary-700" })] }));
}
function WordmarkText({ x = 0 }) {
    return (_jsx("g", { transform: "translate(" + x + ", 0)", className: "logo-wordmark", children: _jsxs("text", { x: "0", y: "22", className: "fill-foreground font-extrabold tracking-wider", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: "15", fontWeight: "800", letterSpacing: "0.08em", children: ["ACCIVA", _jsx("tspan", { dx: "6", fontWeight: "600", className: "fill-primary-500", children: "UI" })] }) }));
}
export function Logo(_a) {
    var _b;
    var { variant = "full", size = "md", mark, src, alt, className, "aria-label": customAriaLabel } = _a, rest = __rest(_a, ["variant", "size", "mark", "src", "alt", "className", "aria-label"]);
    const ariaLabel = customAriaLabel !== null && customAriaLabel !== void 0 ? customAriaLabel : (alt || "ACCIVA UI");
    const isAriaHidden = rest["aria-hidden"] === true || rest["aria-hidden"] === "true";
    const hasCustomMark = Boolean(mark || src);
    if (!hasCustomMark) {
        if (variant === "responsive") {
            const markDim = getDimensions("mark", size);
            const fullDim = getDimensions("full", size);
            return (_jsxs("span", Object.assign({ role: "img", "aria-label": ariaLabel, className: cn("inline-flex items-center shrink-0", className) }, rest, { children: [_jsx("svg", { width: markDim.width, height: markDim.height, viewBox: markDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: "sm:hidden shrink-0", children: _jsx(PrismMonogram, {}) }), _jsxs("svg", { width: fullDim.width, height: fullDim.height, viewBox: fullDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: "hidden sm:inline-block shrink-0", children: [_jsx(PrismMonogram, {}), _jsx(WordmarkText, { x: 40 })] })] })));
        }
        const { width, height, viewBox } = getDimensions(variant, size);
        return (_jsxs("svg", Object.assign({ width: width, height: height, viewBox: viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-label": ariaLabel, className: cn("shrink-0", className) }, rest, { children: [variant === "mark" && _jsx(PrismMonogram, {}), variant === "wordmark" && _jsx(WordmarkText, { x: 0 }), variant === "full" && (_jsxs(_Fragment, { children: [_jsx(PrismMonogram, {}), _jsx(WordmarkText, { x: 40 })] }))] })));
    }
    const height = typeof size === "number" ? size : (_b = SIZE_MAP[size]) !== null && _b !== void 0 ? _b : 32;
    if (variant === "wordmark") {
        const { width, height: wmHeight, viewBox } = getDimensions("wordmark", size);
        return (_jsx("svg", Object.assign({ width: width, height: wmHeight, viewBox: viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-label": ariaLabel, className: cn("shrink-0", className) }, rest, { children: _jsx(WordmarkText, { x: 0 }) })));
    }
    if (variant === "mark") {
        if (src && !mark) {
            const isDecorative = alt === "" || isAriaHidden;
            return (
            // eslint-disable-next-line @next/next/no-img-element
            _jsx("img", Object.assign({ src: src, alt: isDecorative ? "" : (alt !== null && alt !== void 0 ? alt : ariaLabel), "aria-hidden": isDecorative ? "true" : undefined, width: height, height: height, className: cn("shrink-0 object-contain", className) }, rest)));
        }
        return (_jsx("span", Object.assign({ role: isAriaHidden ? undefined : "img", "aria-label": isAriaHidden ? undefined : ariaLabel, "aria-hidden": isAriaHidden ? "true" : undefined, className: cn("inline-flex items-center justify-center shrink-0", className) }, rest, { children: mark })));
    }
    const wordmarkDim = getDimensions("wordmark", size);
    const markElement = mark ? (_jsx("span", { "aria-hidden": "true", className: "inline-flex items-center justify-center shrink-0", children: mark })) : (
    // eslint-disable-next-line @next/next/no-img-element
    _jsx("img", { src: src, alt: "", "aria-hidden": "true", width: height, height: height, className: "h-full w-auto object-contain shrink-0" }));
    return (_jsxs("span", Object.assign({ role: isAriaHidden ? undefined : "img", "aria-label": isAriaHidden ? undefined : ariaLabel, "aria-hidden": isAriaHidden ? "true" : undefined, className: cn("inline-flex items-center gap-2 shrink-0", className) }, rest, { children: [markElement, _jsx("svg", { width: wordmarkDim.width, height: wordmarkDim.height, viewBox: wordmarkDim.viewBox, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", className: cn("shrink-0", variant === "responsive" && "hidden sm:inline-block"), children: _jsx(WordmarkText, { x: 0 }) })] })));
}
