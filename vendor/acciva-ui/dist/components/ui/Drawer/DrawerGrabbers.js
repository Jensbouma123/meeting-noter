import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
function Grip({ isVertical }) {
    return (_jsx("span", { "aria-hidden": "true", className: cn("rounded-full bg-muted-foreground", isVertical ? "h-1.5 w-10" : "h-10 w-1.5") }));
}
/** The resize slider: drags between detents, and steps them with the arrow keys. */
export function DrawerHandle({ isVertical, isPersistent, dragEnabled, orientation, label, valueText, valueMin, valueMax, valueNow, drag, keyboard, }) {
    return (_jsx("button", { type: "button", role: "slider", "data-drawer-grabber": true, "aria-orientation": orientation, "aria-valuemin": valueMin, "aria-valuemax": valueMax, "aria-valuenow": valueNow, "aria-valuetext": valueText, "aria-label": label, onKeyDown: keyboard[5], onClick: keyboard[6], onPointerDown: drag[0], onPointerMove: drag[1], onPointerUp: drag[2], onPointerCancel: drag[3], className: cn("focus-ring flex shrink-0 touch-none items-center justify-center", isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2", dragEnabled
            ? isVertical
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-col-resize"
            : "cursor-pointer", isPersistent && "px-11 md:cursor-pointer"), children: _jsx(Grip, { isVertical: isVertical }) }));
}
/** The standalone grabber for swipe-to-dismiss, used when no resize slider carries the flick. */
export function DrawerSwipeGrabber({ isVertical, isPersistent, label, onDismiss, swipe }) {
    return (_jsx("button", { type: "button", "data-drawer-grabber": true, "aria-label": label, onClick: onDismiss, onPointerDown: swipe[0], onPointerMove: swipe[1], onPointerUp: swipe[2], onPointerCancel: swipe[3], className: cn("focus-ring flex shrink-0 touch-none items-center justify-center", isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2", "cursor-pointer", isPersistent && "px-11"), children: _jsx(Grip, { isVertical: isVertical }) }));
}
