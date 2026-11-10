"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, INPUT_PADDING_X, TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { firstEnabledIndex } from "./navigation.js";
import { SelectListbox } from "./SelectParts.js";
import { useSelectKeyDown } from "./useSelectKeyDown.js";
import { useSelectListEffects } from "./useSelectListEffects.js";
export function Select({ id, options, value, onChange, label, placeholder = "Select an option", disabled = false, size = "md", className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const baseId = useId();
    const listId = `${baseId}-listbox`;
    const labelId = `${baseId}-label`;
    const buttonId = id ?? `${baseId}-button`;
    const anchorName = `--select-${baseId.replace(/[^\w-]/g, "")}`;
    const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
    const [activeIndex, setActiveIndex] = useState(() => (selectedIndex === -1 ? 0 : selectedIndex));
    const selectedOption = selectedIndex === -1 ? null : options[selectedIndex];
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (!label && !ariaLabel && !ariaLabelledBy) {
            console.warn("[a11y] <Select> has no accessible name. Pass a label, aria-label, or aria-labelledby so screen readers can announce the control.");
        }
    }, [label, ariaLabel, ariaLabelledBy]);
    useSelectListEffects(open, activeIndex, buttonRef, listRef, setOpen);
    const openList = () => {
        const start = firstEnabledIndex(options, selectedIndex === -1 ? 0 : selectedIndex, 1);
        setActiveIndex(start === -1 ? 0 : start);
        setOpen(true);
    };
    const commit = (index) => {
        const option = options[index];
        setOpen(false);
        if (!option || option.disabled)
            return;
        onChange(option.value);
    };
    const handleKeyDown = useSelectKeyDown(options, disabled, open, activeIndex, setActiveIndex, setOpen, openList, commit, onChange);
    return (_jsxs(VStack, { spacing: "sm", className: "w-full", children: [label ? (_jsx("span", { id: labelId, className: "text-sm font-medium text-foreground", children: label })) : null, _jsxs("div", { className: "relative", children: [_jsxs("button", { ref: buttonRef, id: buttonId, type: "button", role: "combobox", disabled: disabled, "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": open ? listId : undefined, "aria-activedescendant": open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy ?? (label ? `${labelId} ${buttonId}` : undefined), onClick: () => (open ? setOpen(false) : openList()), onKeyDown: handleKeyDown, onBlur: () => setOpen(false), style: { anchorName }, className: cn("touch-target-44 focus-ring flex w-full items-center justify-between border border-border bg-background text-foreground", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, INPUT_PADDING_X), "transition-colors hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2 dark:active:bg-elevation-3 disabled:cursor-not-allowed disabled:opacity-60", className), children: [_jsx("span", { className: cn(!selectedOption && "text-muted-foreground"), children: selectedOption?.label ?? placeholder }), _jsx(ChevronDown, { className: cn("size-4 text-muted-foreground transition-transform", open && "rotate-180") })] }), open ? (_jsx(SelectListbox, { listRef: listRef, listId: listId, baseId: baseId, anchorName: anchorName, options: options, value: value, activeIndex: activeIndex, ariaLabel: ariaLabel, labelledBy: ariaLabelledBy ?? (label ? labelId : undefined), onCommit: commit, onActivate: setActiveIndex })) : null] })] }));
}
