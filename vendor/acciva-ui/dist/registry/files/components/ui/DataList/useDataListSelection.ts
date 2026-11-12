import { useCallback, useMemo, useState } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";
import { defaultKeyExtractor } from "@/components/ui/DataList/utils";

export function useDataListSelection<T>(props: DataListProps<T>, processedItems: readonly T[]) {
  const {
    selectionMode = "none",
    selectedKeys: controlledSelectedKeys,
    defaultSelectedKeys = [],
    onSelectionChange,
    getItemKey = defaultKeyExtractor,
    isItemDisabled,
  } = props;

  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string | number>>(
    () => new Set(defaultSelectedKeys),
  );

  const selectedKeySet = useMemo<Set<string | number>>(() => {
    if (controlledSelectedKeys !== undefined) {
      return controlledSelectedKeys instanceof Set
        ? controlledSelectedKeys
        : new Set(controlledSelectedKeys);
    }
    return internalSelectedKeys;
  }, [controlledSelectedKeys, internalSelectedKeys]);

  const updateSelection = useCallback(
    (newSet: Set<string | number>, allItems: readonly T[]) => {
      if (controlledSelectedKeys === undefined) {
        setInternalSelectedKeys(newSet);
      }
      if (onSelectionChange) {
        const selectedList = Array.from(newSet);
        const selectedItemObjects = allItems.filter((item, idx) =>
          newSet.has(getItemKey(item, idx)),
        );
        onSelectionChange(selectedList, selectedItemObjects);
      }
    },
    [controlledSelectedKeys, onSelectionChange, getItemKey],
  );

  const handleSelectAll = useCallback(() => {
    const newSet = new Set(selectedKeySet);
    processedItems.forEach((item, idx) => {
      const key = getItemKey(item, idx);
      const disabled = isItemDisabled ? isItemDisabled(item, idx) : false;
      if (!disabled) newSet.add(key);
    });
    updateSelection(newSet, processedItems);
  }, [processedItems, selectedKeySet, getItemKey, isItemDisabled, updateSelection]);

  const handleClearSelection = useCallback(() => {
    updateSelection(new Set(), processedItems);
  }, [processedItems, updateSelection]);

  const handleToggleItemSelection = useCallback(
    (item: T, index: number) => {
      const key = getItemKey(item, index);
      const disabled = isItemDisabled ? isItemDisabled(item, index) : false;
      if (disabled) return;

      const newSet = new Set(selectedKeySet);
      if (selectionMode === "single") {
        if (newSet.has(key)) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(key);
        }
      } else if (selectionMode === "multiple") {
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
      }
      updateSelection(newSet, processedItems);
    },
    [getItemKey, isItemDisabled, selectedKeySet, selectionMode, updateSelection, processedItems],
  );

  const selectedCount = selectedKeySet.size;

  return {
    selectedKeySet,
    selectedCount,
    handleSelectAll,
    handleClearSelection,
    handleToggleItemSelection,
  };
}
