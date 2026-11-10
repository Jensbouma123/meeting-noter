"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { Divider } from "../Divider.js";
import { SIDEBAR_WIDTH_CLASS } from "./SplitPaneConstants.js";
import { SplitPaneSplitter } from "./SplitPaneParts.js";
import { useSideBySide } from "./useSideBySide.js";
import { useSplitterWidth } from "./useSplitterWidth.js";
export function SplitPane({ header, sidebar, detail, defaultSidebarWidth = "md", resizable = false, splitterLabel = "Resize sidebar", onSidebarWidthChange, className, ...props }) {
    const sideBySide = useSideBySide();
    const { widthPx, handleKeyDown, handlePointerDown } = useSplitterWidth(defaultSidebarWidth, onSidebarWidthChange);
    return (_jsxs("div", { className: cn("flex w-full flex-col", className), ...props, children: [header ? (_jsxs(_Fragment, { children: [header, _jsx(Divider, {})] })) : null, _jsxs("div", { className: "flex min-h-0 w-full flex-1 flex-col md:flex-row", children: [_jsx("div", { className: cn("w-full shrink-0", SIDEBAR_WIDTH_CLASS[defaultSidebarWidth]), style: resizable && sideBySide ? { width: widthPx } : undefined, children: sidebar }), resizable ? (_jsxs(_Fragment, { children: [_jsx(Divider, { className: "md:hidden" }), _jsx(SplitPaneSplitter, { widthPx: widthPx, label: splitterLabel, onKeyDown: handleKeyDown, onPointerDown: handlePointerDown })] })) : (_jsxs(_Fragment, { children: [_jsx(Divider, { className: "md:hidden" }), _jsx(Divider, { orientation: "vertical", className: "hidden md:block" })] })), _jsx("div", { className: "min-w-0 flex-1", children: detail })] })] }));
}
