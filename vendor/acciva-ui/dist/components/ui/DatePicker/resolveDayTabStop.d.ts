/**
 * The one day-grid tab stop, shared by DatePicker and DateRangePicker.
 * Anchor: the focused day when the viewed month holds it, else the 1st of the viewed month.
 * Returns the enabled grid day nearest the anchor (earlier day wins a tie), or null when none is enabled.
 */
export declare function resolveDayTabStop(focusedDate: Date, viewDate: Date, cells: readonly {
    date: Date;
}[], isDisabled: (date: Date) => boolean): Date | null;
