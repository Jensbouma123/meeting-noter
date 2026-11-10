import type { CalendarViewMode } from "../DatePicker/index.js";
export declare function getViewWindows(viewDate: Date): {
    startYearDecade: number;
    yearsWindow: number[];
    startCentury: number;
    decadesWindow: {
        start: number;
        end: number;
    }[];
};
export declare function getViewHeaderLabel(viewMode: CalendarViewMode, viewDate: Date): string;
