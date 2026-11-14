import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { rovingIndex } from "@/components/ui/_internal/rovingIndex";
import { isFromNestedControl } from "@/components/ui/DataList/utils";

interface DataListKeyboardNav<T> {
  processedItems: readonly T[];
  activeColumns: number;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  /** First index the keyboard may reach: the current page in `paginated`, else 0. */
  windowStart: number;
  /** Exclusive end of that window. */
  windowEnd: number;
  handleToggleItemSelection: (item: T, index: number) => void;
  handleReorderMove: (from: number, to: number) => void;
}

export function useDataListKeyboard<T>(props: DataListProps<T>, nav: DataListKeyboardNav<T>) {
  const {
    interactive = true,
    layout = "list",
    mode = "virtual",
    selectionMode = "none",
    isItemDisabled,
    onItemClick,
    onReorder,
  } = props;
  const {
    processedItems,
    activeColumns,
    activeIndex,
    setActiveIndex,
    windowStart,
    windowEnd,
    handleToggleItemSelection,
    handleReorderMove,
  } = nav;

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || windowEnd <= windowStart) return;
      const inWindow = activeIndex >= windowStart && activeIndex < windowEnd;
      const isDisabled = (index: number) => isItemDisabled?.(processedItems[index], index) ?? false;

      // Reorder keyboard path (SC 2.1.1): Alt+Arrow moves the active row itself.
      // Virtual mode keeps reorder in the per-row menu (see accessibility spec).
      if (onReorder && mode !== "virtual" && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const to = activeIndex + (event.key === "ArrowUp" ? -1 : 1);
        if (inWindow && !isDisabled(activeIndex) && to >= windowStart && to < windowEnd) {
          handleReorderMove(activeIndex, to);
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        // Keys from a nested control (row-action button, checkbox) belong to it.
        if (isFromNestedControl(event)) return;
        if (inWindow && !isDisabled(activeIndex)) {
          event.preventDefault();
          const currentItem = processedItems[activeIndex];
          if (selectionMode !== "none") {
            handleToggleItemSelection(currentItem, activeIndex);
          }
          onItemClick?.(currentItem, activeIndex);
        }
        return;
      }
      // An index left outside the window (e.g. after a page change) re-enters at its start.
      const next = rovingIndex({
        key: event.key,
        current: inWindow ? activeIndex - windowStart : 0,
        count: windowEnd - windowStart,
        // List rows step by one on every arrow; a grid moves a row of cells on Up/Down.
        orientation: "both",
        columns: layout === "grid" ? activeColumns : 1,
      });
      if (next === null) return;
      event.preventDefault();
      const reenter = !inWindow && event.key.startsWith("Arrow");
      setActiveIndex(windowStart + (reenter ? 0 : next));
    },
    [
      interactive,
      processedItems,
      layout,
      mode,
      activeColumns,
      activeIndex,
      setActiveIndex,
      windowStart,
      windowEnd,
      selectionMode,
      isItemDisabled,
      handleToggleItemSelection,
      onItemClick,
      onReorder,
      handleReorderMove,
    ],
  );
}
