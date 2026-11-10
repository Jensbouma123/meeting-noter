import { type RefObject } from "react";
import type { CalendarViewMode } from "./types.js";
export interface DatePickerViewOptions {
    selectedDate: Date | null;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    containerRef: RefObject<HTMLDivElement | null>;
    gridRef: RefObject<HTMLDivElement | null>;
}
export declare function useDatePickerView({ selectedDate, isOpen, setIsOpen, containerRef, gridRef }: DatePickerViewOptions): {
    viewMode: CalendarViewMode;
    setViewMode: import("react").Dispatch<import("react").SetStateAction<CalendarViewMode>>;
    viewDate: Date;
    setViewDate: import("react").Dispatch<import("react").SetStateAction<Date>>;
    focusedDate: Date;
    setFocusedDate: import("react").Dispatch<import("react").SetStateAction<Date>>;
    moveFocusRef: RefObject<boolean>;
    handlePrevView: () => void;
    handleNextView: () => void;
    cycleViewMode: () => void;
    yearsWindow: number[];
    decadesWindow: {
        start: number;
        end: number;
    }[];
    calendarGrid: import("../../../lib/date-utils/index.js").CalendarDay[];
    viewHeaderLabel: string;
};
export type DatePickerViewModel = ReturnType<typeof useDatePickerView>;
