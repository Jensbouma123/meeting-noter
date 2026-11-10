import type { KeyboardEvent } from "react";
export interface DayGridKeyContext {
    focusedDate: Date;
    viewDate: Date;
    isDateDisabled: (date: Date) => boolean;
    handleSelectDate: (date: Date) => void;
    moveFocusRef: {
        current: boolean;
    };
    setFocusedDate: (date: Date) => void;
    setViewDate: (date: Date) => void;
    close: () => void;
}
export declare function handleDayGridKey(event: KeyboardEvent<HTMLDivElement>, ctx: DayGridKeyContext): void;
