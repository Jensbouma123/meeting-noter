import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { cn } from "../../../lib/utils.js";
import { Button } from "../Button/index.js";
import { Modal } from "../Modal/index.js";
/** The scrolling body. `barVisible` says a connected BottomNav is on screen and owns the bottom inset; `safeAreaPadding={false}` drops it for a host that pads itself. */
export function DrawerContent({ contentRef, innerContentRef, isVertical, barVisible, safeAreaPadding, children }) {
    return (_jsx("div", { ref: contentRef, className: cn("flex-1 overflow-y-auto px-4", isVertical ? "min-h-0" : "min-w-0 pt-4", 
        // A drawer anchored to the viewport bottom has to clear the home indicator itself,
        // or its last control sits under the iOS indicator where a tap is swallowed as a
        // system swipe. Only a bar that is actually on screen removes that duty:
        // `useBottomNavHeight` measures the rendered bar and its own `pb-safe` is inside
        // that height, so adding the inset again would double-count it. The PROP alone is
        // not enough — `connectToBottomNav` with no bar mounted measures 0, which leaves
        // the panel at the viewport bottom with the indicator still to clear.
        barVisible || !safeAreaPadding ? "pb-4" : "pb-4-safe"), children: _jsx("div", { ref: innerContentRef, className: "flow-root", children: children }) }));
}
/** A persistent drawer's close control, pinned to the panel's inline-end corner, and its live readout. */
export function DrawerPersistentChrome({ closeLabel, showCloseOnTouch, onClose, liveText }) {
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: onClose, "aria-label": closeLabel, className: cn("focus-ring absolute end-1 top-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground", !showCloseOnTouch && "touch-concealed"), children: _jsx(X, { className: "size-5" }) }), liveText !== undefined && (_jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: liveText }))] }));
}
/** Confirms a dismissal that would throw away unsaved edits. Renders nothing without `dismissal`. */
export function DrawerDiscardPrompt({ dismissal, open, onKeep, onDiscard }) {
    if (!dismissal)
        return null;
    return (_jsx(Modal, { open: open, onClose: onKeep, role: "alertdialog", size: "sm", title: dismissal.title, description: dismissal.message, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: onKeep, children: dismissal.keepLabel ?? "Keep editing" }), _jsx(Button, { variant: "danger", size: "sm", onClick: onDiscard, children: dismissal.discardLabel ?? "Discard" })] }) }));
}
