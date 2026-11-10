import { cn } from "../../../lib/utils.js";
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_VIRTUAL_HEIGHT = 480;
export const DEFAULT_ITEM_HEIGHT_LIST = 72;
export const DEFAULT_ITEM_HEIGHT_GRID = 200;
export function defaultKeyExtractor(item, index) {
    if (item && typeof item === "object") {
        const candidate = item.id ?? item.key;
        if (typeof candidate === "string" || typeof candidate === "number") {
            return candidate;
        }
    }
    return index;
}
export function extractItemSearchString(item, keys) {
    if (keys && keys.length > 0) {
        return keys
            .map((key) => {
            if (typeof key === "function")
                return key(item);
            if (typeof key === "string" && item && typeof item === "object") {
                return String(item[key] ?? "");
            }
            return "";
        })
            .join(" ")
            .toLowerCase();
    }
    if (typeof item === "string" || typeof item === "number") {
        return String(item).toLowerCase();
    }
    if (item && typeof item === "object") {
        return Object.values(item)
            .filter((val) => typeof val === "string" || typeof val === "number")
            .join(" ")
            .toLowerCase();
    }
    return "";
}
export function chunkArray(array, size) {
    if (size <= 0)
        return [array.slice()];
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
export function toVirtualRole(role) {
    if (role === "feed" || role === "list")
        return "list";
    if (role === "listbox")
        return "listbox";
    if (role === "grid")
        return "rowgroup";
    return "list";
}
export function toVirtualItemRole(itemRole) {
    if (itemRole === "article" || itemRole === "listitem")
        return "listitem";
    if (itemRole === "option")
        return "option";
    if (itemRole === "row")
        return "row";
    return "listitem";
}
export function resolveContainerRole(customRole, mode, selectionMode) {
    return customRole ?? (mode === "infinite" ? "feed" : selectionMode !== "none" ? "listbox" : "list");
}
export function resolveItemRole(customItemRole, containerRole) {
    return (customItemRole ??
        (containerRole === "feed"
            ? "article"
            : containerRole === "listbox"
                ? "option"
                : containerRole === "grid"
                    ? "row"
                    : "listitem"));
}
export function getPageNumbers(currentPage, totalPages) {
    const pages = [];
    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= left && i <= right)) {
            pages.push(i);
        }
        else if (pages[pages.length - 1] !== "ellipsis") {
            pages.push("ellipsis");
        }
    }
    return pages;
}
export function columnCellClass(column) {
    return cn("min-w-0 truncate", column.align === "end" ? "text-end" : "text-start", column.numeric && "tabular-nums");
}
