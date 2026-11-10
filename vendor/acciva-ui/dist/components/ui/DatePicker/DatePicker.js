"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useId, useRef, useState } from "react";
import { formatDefaultDate } from "../../../lib/date-utils/index.js";
import { useArrowHint } from "../../../lib/use-arrow-hint.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { DEFAULT_PRESETS } from "./datePresets.js";
import { DatePickerDialog } from "./DatePickerDialog.js";
import { DatePickerLabel, DatePickerMessages } from "./DatePickerParts.js";
import { DatePickerClearButton, DatePickerTrigger } from "./DatePickerTrigger.js";
import { createDatePickerKeys } from "./datePickerKeys.js";
import { useDatePickerSelection } from "./useDatePickerSelection.js";
import { useDatePickerView } from "./useDatePickerView.js";
export const DatePicker = forwardRef(function DatePicker({ value, defaultValue, onChange, placeholder = "Select date…", label, hint, error, required, disabled = false, readOnly = false, clearable = false, minDate, maxDate, disabledDates, presets = DEFAULT_PRESETS, showPresets = false, formatDate = formatDefaultDate, size = "md", className, id, name, closeOnSelect = true, leadingIcon, "aria-describedby": describedBy, arrowHint, }, forwardedRef) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const dialogId = `${inputId}-dialog`;
    const labelId = `${inputId}-label`;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const gridRef = useRef(null);
    const gridHint = useArrowHint("date-grid", arrowHint, "Use arrow keys to move between days");
    const [isOpen, setIsOpen] = useState(false);
    const closeAndFocusTrigger = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
    }, []);
    const selection = useDatePickerSelection({ value, defaultValue, onChange, minDate, maxDate, disabledDates, disabled, readOnly, clearable, closeOnSelect }, closeAndFocusTrigger);
    const view = useDatePickerView({ selectedDate: selection.selectedDate, isOpen, setIsOpen, containerRef, gridRef });
    const keys = createDatePickerKeys({
        ...view,
        ...selection,
        disabled,
        readOnly,
        isOpen,
        setIsOpen,
        close: closeAndFocusTrigger,
    });
    const setTriggerNode = (node) => {
        triggerRef.current = node;
        if (typeof forwardedRef === "function")
            forwardedRef(node);
        else if (forwardedRef)
            forwardedRef.current = node;
    };
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [_jsx(DatePickerLabel, { id: labelId, htmlFor: inputId, label: label, required: required, size: size }), _jsxs("div", { ref: containerRef, className: "relative", onBlur: keys.handleContainerBlur, children: [_jsx(DatePickerTrigger, { ref: setTriggerNode, id: inputId, name: name, labelledBy: label ? `${labelId} ${inputId}` : undefined, describedBy: describedByIds, dialogId: dialogId, isOpen: isOpen, disabled: disabled, readOnly: readOnly, invalid: Boolean(error), size: size, leadingIcon: leadingIcon, hasValue: Boolean(selection.selectedDate), text: selection.selectedDate ? formatDate(selection.selectedDate) : placeholder, showClear: selection.showClear, onClick: () => {
                            if (!disabled && !readOnly)
                                setIsOpen((prev) => !prev);
                        }, onKeyDown: keys.handleTriggerKeyDown }), selection.showClear ? _jsx(DatePickerClearButton, { size: size, onClear: selection.handleClear }) : null, isOpen ? (_jsx(DatePickerDialog, { dialogId: dialogId, gridRef: gridRef, gridHint: gridHint, view: view, selection: selection, keys: keys, presets: presets, showPresets: showPresets, clearable: clearable, closeOnSelect: closeOnSelect, setIsOpen: setIsOpen })) : null] }), _jsx(DatePickerMessages, { hint: hint, hintId: hintId, error: error, errorId: errorId })] }));
});
