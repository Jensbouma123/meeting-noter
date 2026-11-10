import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { CORNERS } from "./constants.js";
import { pct } from "./geometry.js";
export function ImageCropperHandles({ image, rect, minSize, inert, messages, onCornerKeyDown }) {
    return (_jsx(_Fragment, { children: CORNERS.map((corner) => (
        // `.touch-target-44` forces `position: relative`, so the corner placement lives on a wrapper.
        _jsx("div", { className: "absolute -translate-x-1/2 -translate-y-1/2", style: {
                left: pct(corner.endsWith("left") ? rect.x : rect.x + rect.width, image.width),
                top: pct(corner.startsWith("top") ? rect.y : rect.y + rect.height, image.height),
            }, children: _jsx("div", { "data-crop-part": corner, role: "slider", tabIndex: inert ? -1 : 0, "aria-roledescription": "resize handle", "aria-label": messages.handle(corner), "aria-valuemin": minSize, "aria-valuemax": image.width, "aria-valuenow": rect.width, "aria-valuetext": messages.valueText(rect), "aria-disabled": inert || undefined, onKeyDown: onCornerKeyDown(corner), className: cn(
                // 24px paint meets SC 2.5.8; coarse pointers get the 44px hit area on top.
                "focus-ring touch-target-44 block size-6 rounded-full border-2 border-neutral-950 bg-neutral-50", !inert && (corner === "top-left" || corner === "bottom-right" ? "cursor-nwse-resize" : "cursor-nesw-resize")) }) }, corner))) }));
}
