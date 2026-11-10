"use client";
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
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState, } from "react";
import { cn } from "../../lib/utils.js";
import { Divider } from "./Divider.js";
/**
 * Tier widths at `md` and up. Standard Tailwind scale steps, so the classes
 * below are static and the pixel mirrors stay in lockstep with them.
 */
const SIDEBAR_WIDTH_CLASS = {
    sm: "md:w-56",
    md: "md:w-64",
    lg: "md:w-80",
};
/**
 * Pixel mirrors of the tiers above (Tailwind spacing scale on the 4px unit:
 * `w-56` = 224, `w-64` = 256, `w-80` = 320). Named constants, never literals
 * at the call site; the clamp ends are the neighbouring scale steps.
 */
const SIDEBAR_WIDTH_PX = {
    sm: 224,
    md: 256,
    lg: 320,
};
/** `w-48`: the narrowest usable sidebar. */
const SIDEBAR_MIN_PX = 192;
/** `w-96`: past this the detail pane starves. */
const SIDEBAR_MAX_PX = 384;
/** Arrow-key step: two spacing units. */
const KEYBOARD_STEP_PX = 8;
/** Page-key step: eight spacing units. */
const PAGE_STEP_PX = 32;
/**
 * The `md` breakpoint (768px, the `AccivaBreakpoint.md` token). Pixel widths
 * apply only while this matches, so a dragged width can never squeeze the
 * stacked phone layout.
 */
const SIDEBY_SIDE_QUERY = "(min-width: 768px)";
const clampWidth = (width) => Math.min(SIDEBAR_MAX_PX, Math.max(SIDEBAR_MIN_PX, width));
export function SplitPane(_a) {
    var { header, sidebar, detail, defaultSidebarWidth = "md", resizable = false, splitterLabel = "Resize sidebar", onSidebarWidthChange, className } = _a, props = __rest(_a, ["header", "sidebar", "detail", "defaultSidebarWidth", "resizable", "splitterLabel", "onSidebarWidthChange", "className"]);
    const [widthPx, setWidthPx] = useState(() => SIDEBAR_WIDTH_PX[defaultSidebarWidth]);
    const [sideBySide, setSideBySide] = useState(false);
    useEffect(() => {
        const query = window.matchMedia(SIDEBY_SIDE_QUERY);
        const update = () => setSideBySide(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    const commit = useCallback((width) => {
        const next = clampWidth(Math.round(width));
        setWidthPx(next);
        onSidebarWidthChange === null || onSidebarWidthChange === void 0 ? void 0 : onSidebarWidthChange(next);
    }, [onSidebarWidthChange]);
    const handleKeyDown = (event) => {
        const actions = {
            ArrowRight: widthPx + KEYBOARD_STEP_PX,
            ArrowUp: widthPx + KEYBOARD_STEP_PX,
            ArrowLeft: widthPx - KEYBOARD_STEP_PX,
            ArrowDown: widthPx - KEYBOARD_STEP_PX,
            PageUp: widthPx + PAGE_STEP_PX,
            PageDown: widthPx - PAGE_STEP_PX,
            Home: SIDEBAR_MIN_PX,
            End: SIDEBAR_MAX_PX,
        };
        if (event.key in actions) {
            event.preventDefault();
            commit(actions[event.key]);
        }
    };
    const handlePointerDown = (event) => {
        const startX = event.clientX;
        const startWidth = widthPx;
        const move = (moveEvent) => commit(startWidth + (moveEvent.clientX - startX));
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    return (_jsxs("div", Object.assign({ className: cn("flex w-full flex-col", className) }, props, { children: [header ? (_jsxs(_Fragment, { children: [header, _jsx(Divider, {})] })) : null, _jsxs("div", { className: "flex min-h-0 w-full flex-1 flex-col md:flex-row", children: [_jsx("div", { className: cn("w-full shrink-0", SIDEBAR_WIDTH_CLASS[defaultSidebarWidth]), style: resizable && sideBySide ? { width: widthPx } : undefined, children: sidebar }), resizable ? (_jsxs(_Fragment, { children: [_jsx(Divider, { className: "md:hidden" }), _jsx("div", { role: "separator", tabIndex: 0, "aria-orientation": "vertical", "aria-valuemin": SIDEBAR_MIN_PX, "aria-valuemax": SIDEBAR_MAX_PX, "aria-valuenow": widthPx, "aria-valuetext": `${widthPx} pixels`, "aria-label": splitterLabel, onKeyDown: handleKeyDown, onPointerDown: handlePointerDown, className: "focus-ring hidden w-6 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch md:flex", children: _jsx("span", { "aria-hidden": "true", className: "h-8 w-1 rounded-full bg-border" }) })] })) : (_jsxs(_Fragment, { children: [_jsx(Divider, { className: "md:hidden" }), _jsx(Divider, { orientation: "vertical", className: "hidden md:block" })] })), _jsx("div", { className: "min-w-0 flex-1", children: detail })] })] })));
}
