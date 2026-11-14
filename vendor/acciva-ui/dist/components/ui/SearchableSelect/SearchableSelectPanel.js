import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils.js";
import { ComboboxPanel } from "../_combobox/ComboboxPanel.js";
import { OptionAdornment, highlightMatch } from "../_combobox/parts.js";
import { HStack } from "../HStack.js";
export function SearchableSelectPanel({ value, query, activeIndex, onHover, ...panel }) {
    return (_jsx(ComboboxPanel, { ...panel, selectedValue: value, renderRow: (option, state) => (_jsxs(HStack, { justify: "between", spacing: "sm", className: cn("h-full rounded-md px-3 text-sm transition-colors motion-feedback", option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100 active:bg-primary-500/20", state.index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50 active:bg-primary-500/25", option.value !== value && state.index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", state.disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent" : "cursor-pointer"), onMouseEnter: () => {
                if (!state.disabled)
                    onHover(state.index);
            }, children: [_jsxs(HStack, { as: "span", spacing: "sm", className: "min-w-0", children: [_jsx(OptionAdornment, { icon: option.icon }), _jsx("span", { className: "truncate", children: highlightMatch(option.label, query) })] }), state.selected ? _jsx(Check, { className: "size-4 shrink-0 text-primary-600 dark:text-primary-400" }) : null] })) }));
}
