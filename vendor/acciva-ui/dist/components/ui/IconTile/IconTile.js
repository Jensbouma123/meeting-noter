import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { ICON_TILE_SHAPE_CLASS, ICON_TILE_SIZE_CLASS, ICON_TILE_TONE_CLASS } from "./classes.js";
export function IconTile({ children, tone = "primary", size = "md", shape = "rounded", emphasis = "soft", label, className, ...props }) {
    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
    return (_jsx("span", { ...a11y, ...props, className: cn("inline-flex shrink-0 select-none items-center justify-center font-semibold", ICON_TILE_TONE_CLASS[emphasis][tone], ICON_TILE_SIZE_CLASS[size], ICON_TILE_SHAPE_CLASS[shape], className), children: children }));
}
