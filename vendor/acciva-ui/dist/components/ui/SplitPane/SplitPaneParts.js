import { jsx as _jsx } from "react/jsx-runtime";
import { SIDEBAR_MAX_PX, SIDEBAR_MIN_PX, } from "./SplitPaneConstants.js";
export function SplitPaneSplitter({ widthPx, label, onKeyDown, onPointerDown, }) {
    return (_jsx("div", { role: "separator", tabIndex: 0, "aria-orientation": "vertical", "aria-valuemin": SIDEBAR_MIN_PX, "aria-valuemax": SIDEBAR_MAX_PX, "aria-valuenow": widthPx, "aria-valuetext": `${widthPx} pixels`, "aria-label": label, onKeyDown: onKeyDown, onPointerDown: onPointerDown, className: "focus-ring hidden w-6 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch md:flex", children: _jsx("span", { "aria-hidden": "true", className: "h-8 w-1 rounded-full bg-border" }) }));
}
