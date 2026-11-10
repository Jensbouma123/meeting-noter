import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { MONTH_NAMES_SHORT } from "../../../lib/date-utils/index.js";
import { cn } from "../../../lib/utils.js";
import { Grid } from "../Grid/index.js";
import { getViewWindows } from "./viewWindows.js";
export function DateRangeViewGrids({ ui, gridHint }) {
    const { viewMode, viewDate, startDate, endDate, setViewDate, setViewMode } = ui;
    const { yearsWindow, decadesWindow } = getViewWindows(viewDate);
    return (_jsxs(_Fragment, { children: [viewMode === "month" ? (_jsx(Grid, { role: "grid", "aria-describedby": gridHint.describedBy(), "aria-label": `Select month for ${viewDate.getFullYear()}`, columns: 3, spacing: "sm", className: "pt-1", children: MONTH_NAMES_SHORT.map((mShort, mIndex) => {
                    const isCurrentM = viewDate.getMonth() === mIndex;
                    const isSelectedM = (startDate && startDate.getFullYear() === viewDate.getFullYear() && startDate.getMonth() === mIndex) ||
                        (endDate && endDate.getFullYear() === viewDate.getFullYear() && endDate.getMonth() === mIndex);
                    return (_jsx("button", { type: "button", onClick: () => {
                            setViewDate(new Date(viewDate.getFullYear(), mIndex, 1));
                            setViewMode("day");
                        }, className: cn("focus-ring rounded-lg py-3 text-xs font-medium transition-colors", isSelectedM
                            ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                            : isCurrentM
                                ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                                : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: mShort }, mShort));
                }) })) : null, viewMode === "year" ? (_jsx(Grid, { role: "grid", "aria-describedby": gridHint.describedBy(), "aria-label": "Select year", columns: 3, spacing: "sm", className: "pt-1", children: yearsWindow.map((yearNum) => {
                    const isSelectedY = (startDate && startDate.getFullYear() === yearNum) ||
                        (endDate && endDate.getFullYear() === yearNum);
                    const isCurrentY = new Date().getFullYear() === yearNum;
                    return (_jsx("button", { type: "button", onClick: () => {
                            setViewDate(new Date(yearNum, viewDate.getMonth(), 1));
                            setViewMode("month");
                        }, className: cn("focus-ring rounded-lg py-3 text-xs font-medium transition-colors", isSelectedY
                            ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                            : isCurrentY
                                ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                                : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: yearNum }, yearNum));
                }) })) : null, viewMode === "decade" ? (_jsx(Grid, { role: "grid", "aria-describedby": gridHint.describedBy(), "aria-label": "Select decade", columns: 2, spacing: "sm", className: "pt-1", children: decadesWindow.map((decade) => {
                    const isSelectedDecade = (startDate && startDate.getFullYear() >= decade.start && startDate.getFullYear() <= decade.end) ||
                        (endDate && endDate.getFullYear() >= decade.start && endDate.getFullYear() <= decade.end);
                    return (_jsxs("button", { type: "button", onClick: () => {
                            setViewDate(new Date(decade.start, viewDate.getMonth(), 1));
                            setViewMode("year");
                        }, className: cn("focus-ring rounded-lg px-2 py-3 text-xs font-medium transition-colors", isSelectedDecade
                            ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                            : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3"), children: [decade.start, " \u2013 ", decade.end] }, decade.start));
                }) })) : null] }));
}
