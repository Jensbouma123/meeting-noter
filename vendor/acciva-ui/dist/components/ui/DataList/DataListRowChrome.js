import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { Button } from "../Button/index.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "../DropdownMenu/index.js";
export function DataListRowChrome({ item, index, total, content, actions, canReorder, label, onMove, }) {
    return (_jsxs("div", { className: "flex w-full items-start gap-2", children: [_jsx("div", { className: "min-w-0 flex-1", children: content }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { children: _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: label, onClick: (e) => e.stopPropagation(), className: "shrink-0", children: _jsx(Ellipsis, { className: "size-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [actions.map((action) => (_jsx(DropdownMenuItem, { variant: action.destructive ? "danger" : "default", icon: action.icon, disabled: action.disabled, onClick: (e) => {
                                    e.stopPropagation();
                                    action.onSelect(item, index);
                                }, children: action.label }, action.key))), canReorder && actions.length > 0 && _jsx(DropdownMenuSeparator, {}), canReorder && (_jsxs(_Fragment, { children: [_jsx(DropdownMenuItem, { icon: _jsx(ArrowUp, { className: "size-4" }), disabled: index <= 0, onClick: (e) => {
                                            e.stopPropagation();
                                            onMove(index, index - 1);
                                        }, children: "Move up" }), _jsx(DropdownMenuItem, { icon: _jsx(ArrowDown, { className: "size-4" }), disabled: index >= total - 1, onClick: (e) => {
                                            e.stopPropagation();
                                            onMove(index, index + 1);
                                        }, children: "Move down" })] }))] })] })] }));
}
