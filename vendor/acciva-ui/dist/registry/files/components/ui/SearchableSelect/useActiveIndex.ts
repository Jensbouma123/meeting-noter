import { useCallback, useState } from "react";
import type { SearchableSelectOption } from "@/components/ui/SearchableSelect/types";

export function firstEnabledIndex(list: readonly SearchableSelectOption[]): number {
  const index = list.findIndex((option) => !option.disabled);
  return index === -1 ? 0 : index;
}

/** Tracks the highlighted option, re-seeding it when the list opens or the filtered list / value changes. */
export function useActiveIndex(
  open: boolean,
  filteredOptions: readonly SearchableSelectOption[],
  value: string | null,
) {
  const [activeIndex, setActiveIndex] = useState(0);

  const [activeIndexSyncKey, setActiveIndexSyncKey] = useState({ open, filteredOptions, value });
  const openedNow = open && !activeIndexSyncKey.open;
  const filtersChangedWhileOpen =
    open &&
    activeIndexSyncKey.open &&
    (filteredOptions !== activeIndexSyncKey.filteredOptions || value !== activeIndexSyncKey.value);

  if (
    activeIndexSyncKey.open !== open ||
    filteredOptions !== activeIndexSyncKey.filteredOptions ||
    value !== activeIndexSyncKey.value
  ) {
    setActiveIndexSyncKey({ open, filteredOptions, value });
    if (openedNow || filtersChangedWhileOpen) {
      const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
      setActiveIndex(selectedIndex === -1 ? firstEnabledIndex(filteredOptions) : selectedIndex);
    }
  }

  const moveActive = useCallback(
    (delta: number) => {
      if (filteredOptions.length === 0) return;
      setActiveIndex((current) => {
        let next = current;
        for (let step = 0; step < filteredOptions.length; step++) {
          next = (next + delta + filteredOptions.length) % filteredOptions.length;
          if (!filteredOptions[next].disabled) return next;
        }
        return current;
      });
    },
    [filteredOptions],
  );

  return [activeIndex, setActiveIndex, moveActive] as const;
}
