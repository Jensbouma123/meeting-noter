import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "../Button/index.js";
import { Drawer } from "../Drawer/index.js";
import { Popover } from "../Popover/index.js";
import { VStack } from "../VStack.js";
import { PANEL_TITLE } from "./colorPickerUtils.js";
export function ColorPickerPopup({ surface, panel, triggerRef, onClose }) {
    return (_jsxs(_Fragment, { children: [_jsx(Popover, { open: surface === "popover", onOpenChange: (open) => {
                    if (!open)
                        onClose();
                }, anchorRef: triggerRef, placement: "bottom", dismissOnOutsideClick: true, title: PANEL_TITLE, content: panel }), _jsx(Drawer, { open: surface === "drawer", onOpenChange: (open) => {
                    if (!open)
                        onClose();
                }, side: "bottom", modality: "modal", "aria-label": PANEL_TITLE, children: surface === "drawer" ? (_jsxs(VStack, { spacing: "md", className: "px-4 pb-4", children: [panel, _jsx(Button, { variant: "primary", size: "lg", className: "w-full justify-center", onClick: onClose, children: "Done" })] })) : null })] }));
}
