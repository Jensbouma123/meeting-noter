export const DEFAULT_OPTION_HEIGHT = 36;
export const DEFAULT_MAX_LIST_HEIGHT = 288;
export function defaultFilter(option, query) {
    return option.label.toLowerCase().includes(query);
}
