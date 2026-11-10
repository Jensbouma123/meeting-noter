import type { KeyboardEvent } from "react";
import type { CalendarViewMode } from "../DatePicker/index.js";
import type { DateRangeState } from "./types.js";
type ViewGridMode = Exclude<CalendarViewMode, "day">;
export declare function handleViewGridKey(event: KeyboardEvent<HTMLDivElement>, viewMode: ViewGridMode, state: DateRangeState): void;
export {};
