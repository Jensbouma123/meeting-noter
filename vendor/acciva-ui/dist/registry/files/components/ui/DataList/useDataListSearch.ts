import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { extractItemSearchString } from "@/components/ui/DataList/utils";

export function useDataListSearch<T>(props: DataListProps<T>) {
  const {
    items,
    searchQuery: controlledSearchQuery,
    defaultSearchQuery = "",
    onSearchChange,
    filterFn,
    searchKeys,
  } = props;

  const [internalSearchQuery, setInternalSearchQuery] = useState(defaultSearchQuery);
  const activeSearchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;
  const deferredSearchQuery = useDeferredValue(activeSearchQuery);

  const handleSearchChange = useCallback(
    (newQuery: string) => {
      if (controlledSearchQuery === undefined) {
        setInternalSearchQuery(newQuery);
      }
      onSearchChange?.(newQuery);
    },
    [controlledSearchQuery, onSearchChange],
  );

  const filteredItems = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) return items;

    if (filterFn) {
      return items.filter((item) => filterFn(item, query));
    }

    return items.filter((item) => {
      const text = extractItemSearchString(item, searchKeys);
      return text.includes(query);
    });
  }, [items, deferredSearchQuery, filterFn, searchKeys]);

  return { activeSearchQuery, deferredSearchQuery, handleSearchChange, filteredItems };
}
