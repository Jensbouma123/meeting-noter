import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { compareValues, columnText } from "./dataTableHelpers.js";
export function useDataTableRows(data, columns, initialSort) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState(initialSort ?? null);
    const deferredQuery = useDeferredValue(query);
    const searchableColumns = useMemo(() => columns.filter((column) => column.searchValue || column.sortValue), [columns]);
    const haystack = useMemo(() => {
        if (searchableColumns.length === 0)
            return null;
        return data.map((row) => searchableColumns.map((column) => columnText(column, row)).join(" ").toLowerCase());
    }, [data, searchableColumns]);
    const filtered = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        if (!needle || !haystack)
            return data;
        return data.filter((_, index) => haystack[index].includes(needle));
    }, [data, haystack, deferredQuery]);
    const rows = useMemo(() => {
        if (!sort)
            return filtered;
        const column = columns.find((candidate) => candidate.id === sort.columnId);
        const accessor = column?.sortValue;
        if (!accessor)
            return filtered;
        const factor = sort.direction === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => compareValues(accessor(a), accessor(b)) * factor);
    }, [filtered, sort, columns]);
    const toggleSort = useCallback((columnId) => {
        setSort((current) => {
            if (current?.columnId !== columnId)
                return { columnId, direction: "asc" };
            if (current.direction === "asc")
                return { columnId, direction: "desc" };
            return null;
        });
    }, []);
    return { query, setQuery, sort, rows, toggleSort };
}
