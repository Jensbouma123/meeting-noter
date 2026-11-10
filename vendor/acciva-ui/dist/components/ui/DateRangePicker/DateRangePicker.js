"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useMemo } from "react";
import { formatDefaultDate } from "../../../lib/date-utils/index.js";
import { resolveResponsive, TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { useArrowHint } from "../../../lib/use-arrow-hint.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { DateRangeDialog } from "./DateRangeDialog.js";
import { RangeTrigger } from "./DateRangePickerParts.js";
import { getDefaultRangePresets } from "./presets.js";
import { useDateRangeCalendar } from "./useDateRangeCalendar.js";
import { useDateRangeKeys } from "./useDateRangeKeys.js";
import { useDateRangeValue } from "./useDateRangeValue.js";
export const DateRangePicker = forwardRef(function DateRangePicker({ value, defaultValue, onChange, placeholder = "Select date range…", label, hint, error, required, disabled = false, readOnly = false, clearable = false, minDate, maxDate, disabledDates, presets, showPresets = false, formatDate = formatDefaultDate, size = "md", className, id, name, closeOnSelect = false, leadingIcon, "aria-describedby": describedBy, arrowHint, }, forwardedRef) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const dialogId = `${inputId}-dialog`;
    const labelId = `${inputId}-label`;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const gridHint = useArrowHint("date-grid", arrowHint, "Use arrow keys to move between days");
    const range = useDateRangeValue({ value, defaultValue, onChange, minDate, maxDate, disabledDates });
    const calendar = useDateRangeCalendar(range.startDate);
    const state = { ...range, ...calendar };
    const keys = useDateRangeKeys(state, { disabled, readOnly, closeOnSelect });
    const ui = { ...state, ...keys };
    const setTriggerRef = (node) => {
        calendar.triggerRef.current = node;
        if (typeof forwardedRef === "function")
            forwardedRef(node);
        else if (forwardedRef)
            forwardedRef.current = node;
    };
    const { startDate, endDate, hasSelection } = range;
    const resolvedPresets = useMemo(() => presets ?? getDefaultRangePresets(), [presets]);
    const displayString = useMemo(() => {
        if (startDate && endDate) {
            return `${formatDate(startDate)} – ${formatDate(endDate)}`;
        }
        if (startDate) {
            return `${formatDate(startDate)} – …`;
        }
        return placeholder;
    }, [startDate, endDate, formatDate, placeholder]);
    const showClear = clearable && !disabled && !readOnly && hasSelection;
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("label", { id: labelId, htmlFor: inputId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsxs("div", { ref: calendar.containerRef, className: "relative", onBlur: keys.handleContainerBlur, children: [_jsx(RangeTrigger, { ui: ui, setTriggerRef: setTriggerRef, inputId: inputId, labelId: labelId, dialogId: dialogId, label: label, name: name, disabled: disabled, readOnly: readOnly, error: error, size: size, leadingIcon: leadingIcon, describedByIds: describedByIds, displayString: displayString, showClear: showClear }), ui.isOpen ? (_jsx(DateRangeDialog, { ui: ui, dialogId: dialogId, gridHint: gridHint, presets: resolvedPresets, showPresets: showPresets, clearable: clearable })) : null] }), hint && !error ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null] }));
});
