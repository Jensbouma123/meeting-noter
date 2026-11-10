import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay } from "../../../lib/date-utils/index.js";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
export function DatePickerPresets({ presets, selectedDate, onSelect, }) {
    return (_jsx(HStack, { wrap: true, spacing: "xs", className: "mb-3 border-b border-border/80 pb-2", children: presets.map((preset) => {
            const isPresetActive = selectedDate && isSameDay(selectedDate, preset.value);
            return (_jsx("button", { type: "button", onClick: () => onSelect(preset.value), className: cn("focus-ring rounded-md px-3 py-1 text-xs font-medium transition-colors", isPresetActive
                    ? "bg-primary-600 text-button-primary-foreground font-semibold shadow-xs dark:bg-primary-500"
                    : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4"), children: preset.label }, preset.label));
        }) }));
}
export function DatePickerViewHeader({ view }) {
    return (_jsxs(HStack, { justify: "between", spacing: "xs", className: "pb-2", children: [_jsx("button", { type: "button", "aria-label": "Previous view", onClick: view.handlePrevView, className: "touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: _jsx(ChevronLeft, { className: "size-4" }) }), _jsx("button", { type: "button", "aria-label": `Current view: ${view.viewHeaderLabel}. Click to change view mode`, onClick: view.cycleViewMode, className: "focus-ring rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-elevation-2 dark:hover:bg-elevation-3", children: view.viewHeaderLabel }), _jsx("button", { type: "button", "aria-label": "Next view", onClick: view.handleNextView, className: "touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: _jsx(ChevronRight, { className: "size-4" }) })] }));
}
export function DatePickerFooter({ view, selection, clearable, closeOnSelect, setIsOpen, }) {
    return (_jsxs(HStack, { justify: "between", spacing: "none", className: "mt-3 border-t border-border/80 pt-2", children: [_jsx("button", { type: "button", onClick: () => {
                    const today = new Date();
                    view.setViewDate(today);
                    selection.handleSelectDate(today);
                }, className: "focus-ring rounded-md px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-500/10 active:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-400/20 transition-colors", children: "Today" }), clearable ? (_jsx("button", { type: "button", onClick: () => {
                    selection.handleClear();
                    if (closeOnSelect)
                        setIsOpen(false);
                }, className: "focus-ring rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3", children: "Clear" })) : null] }));
}
