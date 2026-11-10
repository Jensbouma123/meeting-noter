import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { Button } from "../../ui/Button/index.js";
import { Drawer } from "../../ui/Drawer/index.js";
import { Heading } from "../../ui/Heading/index.js";
import { HStack } from "../../ui/HStack.js";
import { VStack } from "../../ui/VStack.js";
export function ListDetailDrawer({ currentItem, detailTitle, renderDetail, onClose }) {
    return (_jsx(Drawer, { open: currentItem !== null && currentItem !== undefined, onOpenChange: (open) => {
            if (!open) {
                onClose();
            }
        }, side: "right", "aria-label": typeof detailTitle === "string"
            ? detailTitle
            : "Detail panel", children: currentItem !== null && currentItem !== undefined && (_jsxs(VStack, { spacing: "lg", inset: "lg", className: "h-full", children: [_jsxs(HStack, { justify: "between", align: "center", className: "border-b border-border pb-4", children: [_jsx(Heading, { level: 2, size: "lg", children: typeof detailTitle === "function"
                                ? detailTitle(currentItem)
                                : detailTitle ?? "Details" }), _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: "Close detail panel", onClick: () => onClose(), className: "touch-target-44", children: _jsx(X, { "aria-hidden": "true", className: "size-5" }) })] }), _jsx("div", { className: "flex-1 overflow-auto", tabIndex: 0, role: "region", "aria-label": "Detail content", children: renderDetail(currentItem, () => onClose()) })] })) }));
}
