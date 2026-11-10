"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useId } from "react";
import { Button } from "../ui/Button/index.js";
import { Drawer } from "../ui/Drawer/index.js";
import { Heading } from "../ui/Heading/index.js";
import { HStack } from "../ui/HStack.js";
import { VStack } from "../ui/VStack.js";
// A right-edge `Drawer` (native `<dialog>`: top layer, inert page, focus containment,
// Escape/light dismiss, scroll lock, focus return, slide enter/exit) with a titled body.
// Not draggable by design.
export function SettingsSheet({ open, onClose, title, children }) {
    const titleId = useId();
    return (_jsx(Drawer, { open: open, onOpenChange: (next) => {
            if (!next)
                onClose();
        }, side: "right", swipeToDismiss: false, "aria-labelledby": titleId, className: "h-full rounded-none", children: _jsxs(VStack, { spacing: "lg", className: "h-full w-full p-4 sm:p-6", children: [_jsxs(HStack, { spacing: "none", justify: "between", children: [_jsx(Heading, { level: 2, id: titleId, children: title }), _jsx(Button, { iconOnly: true, variant: "ghost", tooltip: "Close settings", onClick: onClose, "data-dialog-close": true, leadingIcon: _jsx(X, { className: "size-5" }) })] }), _jsx(VStack, { spacing: "xl", children: children })] }) }));
}
