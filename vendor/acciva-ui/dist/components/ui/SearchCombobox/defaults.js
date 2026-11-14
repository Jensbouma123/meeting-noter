export const DEFAULT_OPTION_HEIGHT = 40;
export const DEFAULT_MAX_LIST_HEIGHT = 320;
export function defaultFilter(option, query) {
    return `${option.label} ${option.keywords ?? ""}`.toLowerCase().includes(query);
}
