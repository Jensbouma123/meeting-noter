import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { ITEM_CLASS, LABEL_CLASS } from "./BottomNavClasses.js";
export function BottomNavItemView({ item }) {
    const itemClassName = cn(ITEM_CLASS, item.current ? "text-foreground" : "text-muted-foreground hover:text-foreground active:text-foreground");
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", className: "flex shrink-0 justify-center", children: item.icon }), _jsx("span", { className: LABEL_CLASS, children: item.label })] }));
    return (_jsx("li", { className: "min-w-0 flex-1", children: item.href === undefined ? (_jsx("button", { type: "button", onClick: item.onClick, "aria-label": item.label, "aria-current": item.current ? "page" : undefined, "aria-expanded": item.expanded, "aria-controls": item.controls, className: itemClassName, children: content })) : (_jsx("a", { href: item.href, "aria-label": item.label, "aria-current": item.current ? "page" : undefined, className: itemClassName, children: content })) }));
}
