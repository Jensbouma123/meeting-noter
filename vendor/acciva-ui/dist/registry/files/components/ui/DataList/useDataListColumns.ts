import { useEffect, useMemo, useState, type RefObject } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { chunkArray } from "@/components/ui/DataList/utils";

export function useDataListColumns<T>(
  props: DataListProps<T>,
  processedItems: readonly T[],
  listContainerRef: RefObject<HTMLDivElement | null>,
) {
  const { columns = 3, mode = "virtual", layout = "list" } = props;

  const [responsiveColumns, setResponsiveColumns] = useState<number>(() => {
    if (typeof columns === "number") return columns;
    return columns.lg ?? columns.md ?? columns.sm ?? 3;
  });

  const activeColumns = typeof columns === "number" ? columns : responsiveColumns;

  useEffect(() => {
    if (typeof columns === "number") return;

    const updateCols = () => {
      const width = listContainerRef.current?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1024);
      if (width >= 1280 && columns.xl) setResponsiveColumns(columns.xl);
      else if (width >= 1024 && columns.lg) setResponsiveColumns(columns.lg);
      else if (width >= 768 && columns.md) setResponsiveColumns(columns.md);
      else if (columns.sm) setResponsiveColumns(columns.sm);
      else setResponsiveColumns(1);
    };

    updateCols();
    if (typeof ResizeObserver === "undefined") return;
    const element = listContainerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateCols);
    observer.observe(element);
    return () => observer.disconnect();
  }, [columns, listContainerRef]);

  const virtualRows = useMemo(() => {
    if (mode !== "virtual" || layout !== "grid") return [];
    return chunkArray(processedItems, activeColumns);
  }, [mode, layout, processedItems, activeColumns]);

  return { activeColumns, virtualRows };
}
