import { addDays } from "../../../lib/date-utils/index.js";
// Built per call so "Today" reflects the current day, not the module-load day.
export function getDefaultDatePresets() {
    const today = new Date();
    return [
        { label: "Today", value: today },
        { label: "Tomorrow", value: addDays(today, 1) },
        { label: "In 7 Days", value: addDays(today, 7) },
        { label: "In 30 Days", value: addDays(today, 30) },
    ];
}
