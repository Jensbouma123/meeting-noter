import { useImperativeHandle, type RefObject } from "react";
import type { VirtualListHandle } from "@/components/ui/VirtualList/index";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";

interface DataListImperativeNav {
  activeColumns: number;
  virtualListRef: RefObject<VirtualListHandle | null>;
  listContainerRef: RefObject<HTMLDivElement | null>;
  handleClearSelection: () => void;
  handleSelectAll: () => void;
}

export function useDataListImperative<T>(props: DataListProps<T>, nav: DataListImperativeNav) {
  const { listRef, mode = "virtual", layout = "list" } = props;
  const { activeColumns, virtualListRef, listContainerRef, handleClearSelection, handleSelectAll } = nav;

  useImperativeHandle(
    listRef,
    () => ({
      scrollToIndex: (index: number) => {
        if (mode === "virtual") {
          if (layout === "grid") {
            const rowIndex = Math.floor(index / activeColumns);
            virtualListRef.current?.scrollToIndex(rowIndex);
          } else {
            virtualListRef.current?.scrollToIndex(index);
          }
        }
      },
      scrollToOffset: (offset: number) => {
        if (mode === "virtual") {
          virtualListRef.current?.scrollToOffset(offset);
        } else if (listContainerRef.current) {
          listContainerRef.current.scrollTop = offset;
        }
      },
      getScrollElement: () => {
        if (mode === "virtual") {
          return virtualListRef.current?.getScrollElement() ?? null;
        }
        return listContainerRef.current;
      },
      clearSelection: handleClearSelection,
      selectAll: handleSelectAll,
    }),
    [mode, layout, activeColumns, virtualListRef, listContainerRef, handleClearSelection, handleSelectAll],
  );
}
