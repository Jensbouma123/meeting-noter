import { useCallback, useMemo, useState } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import type { DataListSortDirection } from "@/components/ui/DataList/types";

export function useDataListSort<T>(props: DataListProps<T>, filteredItems: readonly T[]) {
  const {
    sortable = false,
    sortOptions,
    sortKey: controlledSortKey,
    defaultSortKey,
    sortDirection: controlledSortDirection,
    defaultSortDirection = "asc",
    onSortChange,
    sortFn,
  } = props;

  const [internalSortKey, setInternalSortKey] = useState<string | undefined>(
    defaultSortKey ?? sortOptions?.[0]?.key,
  );
  const [internalSortDirection, setInternalSortDirection] = useState<DataListSortDirection>(defaultSortDirection);

  const activeSortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
  const activeSortDirection =
    controlledSortDirection !== undefined ? controlledSortDirection : internalSortDirection;

  const handleSortChange = useCallback(
    (key: string, direction: DataListSortDirection) => {
      if (controlledSortKey === undefined) setInternalSortKey(key);
      if (controlledSortDirection === undefined) setInternalSortDirection(direction);
      onSortChange?.(key, direction);
    },
    [controlledSortKey, controlledSortDirection, onSortChange],
  );

  const toggleSortDirection = useCallback(() => {
    const nextDirection: DataListSortDirection = activeSortDirection === "asc" ? "desc" : "asc";
    if (activeSortKey) {
      handleSortChange(activeSortKey, nextDirection);
    }
  }, [activeSortKey, activeSortDirection, handleSortChange]);

  const processedItems = useMemo(() => {
    if (!sortable && !sortFn) return filteredItems;

    const list = [...filteredItems];
    const factor = activeSortDirection === "asc" ? 1 : -1;

    if (sortFn) {
      return list.sort((a, b) => sortFn(a, b) * factor);
    }

    if (activeSortKey && sortOptions) {
      const selectedOption = sortOptions.find((opt) => opt.key === activeSortKey);
      if (selectedOption?.compare) {
        return list.sort((a, b) => selectedOption.compare!(a, b) * factor);
      }
    }

    if (activeSortKey) {
      return list.sort((a, b) => {
        const valA = (a as Record<string, unknown>)[activeSortKey];
        const valB = (b as Record<string, unknown>)[activeSortKey];
        if (typeof valA === "number" && typeof valB === "number") {
          return (valA - valB) * factor;
        }
        return String(valA ?? "").localeCompare(String(valB ?? ""), undefined, { numeric: true }) * factor;
      });
    }

    return list;
  }, [filteredItems, sortable, sortFn, activeSortKey, activeSortDirection, sortOptions]);

  return { activeSortKey, activeSortDirection, handleSortChange, toggleSortDirection, processedItems };
}
