import { addDays } from "../../../lib/date-utils/index.js";
export const DEFAULT_PRESETS = [
    { label: "Today", value: new Date() },
    { label: "Tomorrow", value: addDays(new Date(), 1) },
    { label: "In 7 Days", value: addDays(new Date(), 7) },
    { label: "In 30 Days", value: addDays(new Date(), 30) },
];
