import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PrismMonogram() {
    return (_jsxs("g", { className: "logo-prism-monogram", children: [_jsx("polygon", { points: "16,3 20,11 16,16 12,11", className: "fill-primary-400" }), _jsx("polygon", { points: "16,3 12,11 16,16 16,13", className: "fill-primary-600", opacity: "0.9" }), _jsx("polygon", { points: "12,11 4,27 10,27 16,16", className: "fill-primary-600" }), _jsx("polygon", { points: "20,11 28,27 22,27 16,16", className: "fill-primary-500" }), _jsx("polygon", { points: "8.5,19 23.5,19 21,24 11,24", className: "fill-primary-400" }), _jsx("polygon", { points: "16,13 13,19 19,19", className: "fill-primary-700" })] }));
}
export function WordmarkText({ x = 0 }) {
    return (_jsx("g", { transform: "translate(" + x + ", 0)", className: "logo-wordmark", children: _jsxs("text", { x: "0", y: "22", className: "fill-foreground font-extrabold tracking-wider", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: "15", fontWeight: "800", letterSpacing: "0.08em", children: ["ACCIVA", _jsx("tspan", { dx: "6", fontWeight: "600", className: "fill-primary-500", children: "UI" })] }) }));
}
