import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
function handleListMouseDown(event) {
    event.preventDefault();
}
export function SelectListbox({ listRef, listId, baseId, anchorName, options, value, activeIndex, ariaLabel, labelledBy, onCommit, onActivate, }) {
    // Top layer escapes any `overflow: hidden` ancestor; `manual` leaves outside-press and Escape to
    // Select (it keeps focus on the trigger), and anchor positioning tracks the trigger without measuring.
    useEffect(() => {
        const list = listRef.current;
        if (list?.showPopover && !list.matches(":popover-open"))
            list.showPopover();
    }, [listRef]);
    return (_jsx("ul", { ref: listRef, id: listId, role: "listbox", "aria-label": ariaLabel, "aria-labelledby": labelledBy, popover: "manual", onMouseDown: handleListMouseDown, style: { positionAnchor: anchorName, positionArea: "block-end span-all", positionTryFallbacks: "flip-block", minWidth: "anchor-size(width)" }, className: cn("select-list max-h-60 overflow-auto rounded-lg border border-border bg-surface p-1 text-foreground shadow-lg animate-fade-in"), children: options.map((option, index) => (_jsxs(HStack, { as: "li", id: `${baseId}-option-${index}`, "data-index": index, role: "option", justify: "between", spacing: "none", "aria-selected": option.value === value, "aria-disabled": option.disabled, onMouseEnter: () => onActivate(index), onClick: () => onCommit(index), className: cn("cursor-pointer rounded-md px-3 py-2 text-sm transition-colors", option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100", index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50", option.value !== value && index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", option.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent"), children: [_jsx("span", { children: option.label }), option.value === value ? (_jsx(Check, { className: "size-4 shrink-0 text-primary-600 dark:text-primary-400" })) : null] }, option.value))) }));
}
