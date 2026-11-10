import type { KeyboardEvent } from "react";
import type { CalendarViewMode } from "./types.js";
/** Month, year and decade views: arrows move the window, Enter/Escape step the view mode. */
export declare function handleViewGridKey(event: KeyboardEvent<HTMLDivElement>, viewMode: CalendarViewMode, viewDate: Date, setViewDate: (date: Date) => void, setViewMode: (mode: CalendarViewMode) => void): void;
