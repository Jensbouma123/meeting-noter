"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useId, useRef, } from "react";
import { ICON_SCALE_CLASS, TAB_LIST_GAP, TAB_LIST_PADDING, TAB_PADDING, TAB_RADIUS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
const TAB_LIST_FLOW = {
    horizontal: "flex-row items-center",
    vertical: "flex-col items-stretch",
};
// The rule an `underline` list draws sits on the edge the tabs stack against: under a
// horizontal row, beside a vertical column. Each tab's own 2px edge overlaps it (see TAB_EDGE).
const TAB_LIST_SHELL = {
    pill: {
        horizontal: "rounded-lg bg-elevation-2",
        vertical: "rounded-lg bg-elevation-2",
    },
    underline: {
        horizontal: "border-b border-border",
        vertical: "border-l border-border",
    },
};
// `null` means the variant has no per-tier value for that slot at all — an underline list is
// flush against its rule and an underline tab is square, so neither reads the size ramp.
const TAB_LIST_INSET = {
    pill: TAB_LIST_PADDING,
    underline: null,
};
const TAB_SHAPE = {
    pill: TAB_RADIUS,
    underline: null,
};
const TAB_EDGE = {
    pill: { horizontal: "", vertical: "" },
    underline: {
        horizontal: "-mb-px justify-center border-b-2 border-transparent",
        vertical: "-ml-px justify-start border-l-2 border-transparent",
    },
};
// `primary-500`/`primary-300` are the two stops on the ramp that hold the 3:1 non-text
// contrast floor (SC 1.4.11) against light and dark backgrounds respectively; the selected
// tab's own label stays `text-foreground` so colour is never the only signal (SC 1.4.1).
const TAB_SELECTED = {
    pill: "bg-background text-foreground shadow-sm",
    underline: "border-primary-500 text-foreground dark:border-primary-300",
};
const TAB_IDLE = {
    pill: "text-muted-foreground hover:text-foreground hover:bg-elevation-2 active:bg-elevation-3 active:text-foreground dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    underline: "text-muted-foreground hover:border-border hover:text-foreground active:border-muted-foreground active:text-foreground",
};
const TabsContext = createContext(null);
function useTabsContext(component) {
    const ctx = useContext(TabsContext);
    if (!ctx)
        throw new Error(`<${component}> must be used within <Tabs>`);
    return ctx;
}
export function Tabs({ value, onValueChange, children, className, size = "md", variant = "pill", orientation = "horizontal", }) {
    const baseId = useId();
    return (_jsx(TabsContext.Provider, { value: { value, setValue: onValueChange, baseId, size, variant, orientation }, children: _jsx("div", { className: className, children: children }) }));
}
export function TabList({ children, className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }) {
    const listRef = useRef(null);
    const { size, variant, orientation } = useTabsContext("TabList");
    const listInset = TAB_LIST_INSET[variant];
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (!ariaLabel && !ariaLabelledBy) {
            console.warn("[a11y] <TabList> has no accessible name. Pass aria-label or aria-labelledby so screen readers can announce what the tabs control.");
        }
    }, [ariaLabel, ariaLabelledBy]);
    const handleKeyDown = (event) => {
        const list = listRef.current;
        if (!list)
            return;
        const tabs = Array.from(list.querySelectorAll('[role="tab"]:not([disabled])'));
        if (tabs.length === 0)
            return;
        const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
        if (currentIndex === -1)
            return;
        let nextIndex = null;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    };
    return (_jsx("div", { ref: listRef, role: "tablist", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-orientation": orientation === "vertical" ? "vertical" : undefined, onKeyDown: handleKeyDown, className: cn("inline-flex", TAB_LIST_FLOW[orientation], TAB_LIST_SHELL[variant][orientation], listInset ? resolveResponsive(size, listInset) : undefined, resolveResponsive(size, TAB_LIST_GAP), className), children: children }));
}
export function Tab({ value, children, disabled, className }) {
    const { value: activeValue, setValue, baseId, size, variant, orientation } = useTabsContext("Tab");
    const selected = value === activeValue;
    const tabShape = TAB_SHAPE[variant];
    return (_jsx("button", { type: "button", role: "tab", id: `${baseId}-tab-${value}`, "aria-selected": selected, "aria-controls": `${baseId}-panel-${value}`, tabIndex: selected ? 0 : -1, disabled: disabled, onClick: () => setValue(value), className: cn(
        // min-h-6 is the SC 2.5.8 24px floor: at `xxs`/`sm` the tier's own padding
        // and text size add up to less than that, and tabs sit a couple of pixels
        // apart, so they cannot fall back on the spacing exception.
        "focus-ring inline-flex min-h-6 items-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60", tabShape ? resolveResponsive(size, tabShape) : undefined, TAB_EDGE[variant][orientation], resolveResponsive(size, TAB_PADDING), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined, selected ? TAB_SELECTED[variant] : TAB_IDLE[variant], className), children: children }));
}
/**
 * The panel element stays mounted while inactive so the owning tab's
 * `aria-controls` always resolves; only its subtree is torn down. `hidden`
 * keeps the idle panel out of the accessibility tree and the tab order.
 */
export function TabPanel({ value, children, className }) {
    const { value: activeValue, baseId } = useTabsContext("TabPanel");
    const selected = value === activeValue;
    return (_jsx("div", { id: `${baseId}-panel-${value}`, role: "tabpanel", hidden: !selected, tabIndex: selected ? 0 : -1, "aria-labelledby": `${baseId}-tab-${value}`, className: cn("animate-fade-in", className), children: selected ? children : null }));
}
