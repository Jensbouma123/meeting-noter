import { useCallback, type KeyboardEvent } from "react";
import { rovingIndex } from "@/components/ui/_internal/rovingIndex";
import type { VirtualListAlignment, VirtualListProps } from "@/components/ui/VirtualList/types";

interface VirtualKeyboardOptions<T> {
  items: readonly T[];
  isItemDisabled?: VirtualListProps<T>["isItemDisabled"];
  onItemSelect?: VirtualListProps<T>["onItemSelect"];
  activeIndex?: number;
  onActiveIndexChange?: VirtualListProps<T>["onActiveIndexChange"];
  resolvedActiveIndex: number;
  setInternalActiveIndex: (index: number) => void;
  scrollToIndex: (index: number, align?: VirtualListAlignment) => void;
  sizeAt: (index: number) => number;
  viewportHeight: number;
}

export function useVirtualKeyboard<T>({
  items,
  isItemDisabled,
  onItemSelect,
  activeIndex,
  onActiveIndexChange,
  resolvedActiveIndex,
  setInternalActiveIndex,
  scrollToIndex,
  sizeAt,
  viewportHeight,
}: VirtualKeyboardOptions<T>) {
  const count = items.length;

  const disabledAt = useCallback(
    (index: number) => (isItemDisabled ? isItemDisabled(items[index], index) : false),
    [isItemDisabled, items],
  );

  const setActiveIndex = useCallback(
    (index: number) => {
      if (activeIndex === undefined) setInternalActiveIndex(index);
      onActiveIndexChange?.(index);
      scrollToIndex(index);
    },
    [activeIndex, onActiveIndexChange, scrollToIndex, setInternalActiveIndex],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (count === 0) return;
      const page = Math.max(1, Math.floor(viewportHeight / Math.max(1, sizeAt(resolvedActiveIndex))) - 1);

      const next = rovingIndex({
        key: event.key,
        current: resolvedActiveIndex,
        count,
        orientation: "vertical",
        page,
        isDisabled: disabledAt,
      });
      if (next !== null) {
        event.preventDefault();
        setActiveIndex(next);
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && onItemSelect) {
        event.preventDefault();
        if (!disabledAt(resolvedActiveIndex)) onItemSelect(items[resolvedActiveIndex], resolvedActiveIndex);
      }
    },
    [count, viewportHeight, sizeAt, resolvedActiveIndex, setActiveIndex, onItemSelect, disabledAt, items],
  );

  return { handleKeyDown, disabledAt };
}
