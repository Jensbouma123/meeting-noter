"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { cn } from "../../../lib/utils.js";
const LINK_CLASS = cn("focus-ring motion-feedback relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors", "text-muted-foreground hover:text-foreground active:text-foreground", "[&_svg]:size-4 [&_svg]:shrink-0");
// The scroll region holds real links (`Link` is an <a>), so it needs no tabIndex of its own;
// the lint rule only sees intrinsic tags, hence the class lives in a constant.
const LIST_CLASS = "scrollbar-hidden flex items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain py-1 md:gap-2";
// Not colour alone (SC 1.4.1): weight plus a bar under the label.
const CURRENT_CLASS = "font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary-500 dark:after:bg-primary-300";
export function NavBar({ items, "aria-label": ariaLabel = "Primary", linkComponent: Link = "a", className, }) {
    const listRef = useRef(null);
    // Overflow scrolls inside the list; bring the active link into view (SC 1.4.10).
    useEffect(() => {
        const list = listRef.current;
        const current = list?.querySelector("[aria-current='page']");
        if (!list || !current)
            return;
        list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
    }, [items]);
    return (_jsx("nav", { "aria-label": ariaLabel, className: cn("min-w-0 max-w-full", className), children: _jsx("ul", { ref: listRef, className: LIST_CLASS, children: items.map((item) => (_jsx("li", { className: "shrink-0", children: _jsxs(Link, { href: item.href, "aria-current": item.current ? "page" : undefined, className: cn(LINK_CLASS, item.current && CURRENT_CLASS), children: [item.icon ? _jsx("span", { "aria-hidden": "true", className: "flex shrink-0", children: item.icon }) : null, item.label] }) }, item.href))) }) }));
}
