import { jsx as _jsx } from "react/jsx-runtime";
export function columnText(column, row) {
    if (column.searchValue)
        return column.searchValue(row);
    if (column.sortValue)
        return String(column.sortValue(row));
    return "";
}
export function compareValues(a, b) {
    if (typeof a === "number" && typeof b === "number")
        return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
/** Clamped cells still need the full text for a mouse-hover tooltip since the CSS clamp only hides it visually. */
export function clampTitle(column, row) {
    if (!column.wrap || !column.maxLines)
        return undefined;
    return columnText(column, row) || undefined;
}
export function renderCellValue(column, row) {
    const content = column.cell(row);
    if (!column.wrap || !column.maxLines)
        return content;
    const clampStyle = {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: column.maxLines,
        overflow: "hidden",
    };
    return (_jsx("span", { className: "block min-w-0 wrap-anywhere whitespace-normal", style: clampStyle, children: content }));
}
