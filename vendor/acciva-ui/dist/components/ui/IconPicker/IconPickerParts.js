import { jsx as _jsx } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { createElement } from "react";
import { HStack } from "../HStack.js";
import { getIconComponent } from "../../../lib/icon-registry.js";
import { cn } from "../../../lib/utils.js";
import { CATEGORY_OPTIONS } from "./constants.js";
export function SelectedIconPreview({ name }) {
    const Icon = getIconComponent(name);
    if (!Icon)
        return _jsx(Search, { className: "size-4", "aria-hidden": "true" });
    return createElement(Icon, { className: "size-4", "aria-hidden": true });
}
export function IconCategoryChips({ category, onSelect, }) {
    return (_jsx(HStack, { align: "stretch", wrap: true, spacing: "sm", children: CATEGORY_OPTIONS.map((option) => (_jsx("button", { type: "button", "aria-pressed": category === option, onClick: () => onSelect(option), className: cn("focus-ring rounded-full px-3 py-1 text-xs font-medium transition-colors", category === option
                ? "bg-primary-600 text-button-primary-foreground font-semibold dark:bg-primary-500"
                : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4"), children: option }, option))) }));
}
export function IconOptionButton({ name, selected, tabIndex, onFocus, onClick, }) {
    const Icon = getIconComponent(name);
    if (!Icon)
        return null;
    return (_jsx("button", { type: "button", role: "option", "aria-selected": selected, "aria-label": name, title: name, tabIndex: tabIndex, onFocus: onFocus, onClick: onClick, className: cn("focus-ring flex aspect-square items-center justify-center rounded-md transition-colors", selected
            ? "bg-primary-600 text-button-primary-foreground shadow-xs dark:bg-primary-500"
            : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"), children: createElement(Icon, { className: "size-4", "aria-hidden": true }) }));
}
