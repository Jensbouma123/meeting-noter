// Chrome per variant. `default` is the bordered, filled, divided panel; `plain` is a
// chrome-less inline disclosure row (no border, fill, radius or dividers).
export const ROOT_CHROME = {
    default: "divide-y divide-border rounded-xl border border-border bg-surface",
    plain: "",
};
export const ITEM_CHROME = {
    default: "overflow-hidden first:rounded-t-xl last:rounded-b-xl",
    plain: "",
};
export const TRIGGER_CHROME = {
    default: "justify-between p-4 hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    plain: "min-h-11 gap-2 py-3 hover:underline",
};
export const CONTENT_CHROME = {
    default: "px-4 pb-4 pt-1",
    plain: "pb-3 pl-6 pt-1",
};
