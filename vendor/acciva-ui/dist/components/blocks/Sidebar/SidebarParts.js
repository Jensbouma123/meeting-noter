import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { Button } from "../../ui/Button/index.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "../../ui/DropdownMenu/index.js";
import { isIconComponent } from "./sidebarHelpers.js";
/**
 * `display: contents` keeps the wrapper out of the box model, so a caller-supplied
 * component gets the exact size classes the rail/drawer applies while an
 * already-rendered node keeps its own — both stay `aria-hidden` since the link's own
 * `aria-label`/text carries the accessible name.
 */
export function SidebarGlyph({ icon, className }) {
    if (isIconComponent(icon)) {
        const Icon = icon;
        return (_jsx("span", { "aria-hidden": "true", className: "contents", children: _jsx(Icon, { className: className }) }));
    }
    return (_jsx("span", { "aria-hidden": "true", className: "contents", children: icon }));
}
/**
 * Per-row reorder menu. Move up / Move down are rendered only where they apply, so the
 * first row has no Move up and the last row no Move down (as AccivaSidebar does).
 */
export function SidebarReorderMenu({ label, index, total, onMove, }) {
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { children: _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: `Reorder ${label}`, className: "shrink-0", children: _jsx(Ellipsis, { className: "size-4" }) }) }), _jsxs(DropdownMenuContent, { align: "start", children: [index > 0 && (_jsx(DropdownMenuItem, { icon: _jsx(ArrowUp, { className: "size-4" }), onClick: () => onMove(index, index - 1), children: "Move up" })), index < total - 1 && (_jsx(DropdownMenuItem, { icon: _jsx(ArrowDown, { className: "size-4" }), onClick: () => onMove(index, index + 1), children: "Move down" }))] })] }));
}
