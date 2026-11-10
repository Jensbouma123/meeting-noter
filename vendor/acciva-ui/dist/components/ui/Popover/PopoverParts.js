import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { Button } from "../Button/index.js";
import { Tooltip } from "../Tooltip/index.js";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
export function PopoverHeader({ title, titleId, onClose, }) {
    return (_jsxs("div", { className: cn("flex items-start gap-2", title ? "justify-between" : "justify-end"), children: [title && (_jsx("h2", { id: titleId, className: cn("font-semibold text-foreground leading-snug break-words", TEXT_SIZE.sm), children: title })), _jsx(Tooltip, { content: "Close", delay: 150, children: _jsx("span", { className: "inline-flex shrink-0 -mr-1 -mt-1", children: _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Close", "data-dialog-close": true, onClick: onClose, onFocus: (e) => e.stopPropagation(), className: "touch-target-44 justify-center p-0", children: _jsx(X, { className: "size-4", "aria-hidden": "true" }) }) }) })] }));
}
export function PopoverBody({ id, hasTitle, children, }) {
    return (_jsx("div", { id: id, className: cn("popover-body text-muted-foreground break-words whitespace-normal overflow-y-auto", TEXT_SIZE.xs, hasTitle ? "mt-1.5" : "mt-0"), children: children }));
}
export function PopoverAction({ label, onAction }) {
    return (_jsx("div", { className: "mt-3 flex justify-end", children: _jsx(Button, { variant: "primary", size: "xs", onClick: onAction, children: label }) }));
}
