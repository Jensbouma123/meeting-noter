import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowHint } from "../../../lib/ArrowHint.js";
import { SURFACE_RADIUS, SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { DatePickerDayGrid } from "./DatePickerDayGrid.js";
import { DatePickerViewGrids } from "./DatePickerViewGrids.js";
import { DatePickerFooter, DatePickerPresets, DatePickerViewHeader } from "./DatePickerDialogParts.js";
export function DatePickerDialog({ dialogId, gridRef, gridHint, view, selection, keys, presets, showPresets, clearable, closeOnSelect, setIsOpen, }) {
    return (_jsxs("div", { id: dialogId, role: "dialog", tabIndex: -1, onKeyDown: keys.handleDialogKeyDown, "aria-modal": "false", "aria-label": "Choose date", className: `absolute left-0 z-50 mt-2 w-72 border border-border bg-surface p-3 animate-fade-in focus:outline-none ${SURFACE_RADIUS.overlay} ${SURFACE_SHADOW.overlay}`, children: [showPresets && presets && presets.length > 0 ? (_jsx(DatePickerPresets, { presets: presets, selectedDate: selection.selectedDate, onSelect: selection.handleSelectDate })) : null, _jsx(DatePickerViewHeader, { view: view }), _jsxs("div", { ref: gridRef, onKeyDown: keys.handleGridKeyDown, ...gridHint.groupProps, className: "relative focus:outline-none", children: [view.viewMode === "day" ? _jsx(DatePickerDayGrid, { view: view, selection: selection, gridHint: gridHint }) : null, _jsx(DatePickerViewGrids, { view: view, selection: selection, gridHint: gridHint }), _jsx(ArrowHint, { id: gridHint.id, text: gridHint.text, visible: gridHint.visible, className: "top-auto bottom-0 mb-1" })] }), _jsx(DatePickerFooter, { view: view, selection: selection, clearable: clearable, closeOnSelect: closeOnSelect, setIsOpen: setIsOpen })] }));
}
