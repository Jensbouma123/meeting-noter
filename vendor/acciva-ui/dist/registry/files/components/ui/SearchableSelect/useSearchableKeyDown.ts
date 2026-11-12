import { useCallback, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { firstEnabledIndex } from "@/components/ui/SearchableSelect/useActiveIndex";
import type { SearchableSelectOption } from "@/components/ui/SearchableSelect/types";

/** Keyboard model of the combobox input: arrows move the highlight, Enter commits, Escape and Tab dismiss. */
export function useSearchableKeyDown(
  disabled: boolean,
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  filteredOptions: readonly SearchableSelectOption[],
  activeIndex: number,
  setActiveIndex: Dispatch<SetStateAction<number>>,
  moveActive: (delta: number) => void,
  commit: (index: number) => void,
  close: () => void,
) {
  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (!open) setOpen(true);
          else moveActive(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          if (!open) setOpen(true);
          else moveActive(-1);
          break;
        case "Home":
          if (!open) return;
          event.preventDefault();
          setActiveIndex(firstEnabledIndex(filteredOptions));
          break;
        case "End": {
          if (!open) return;
          event.preventDefault();
          for (let index = filteredOptions.length - 1; index >= 0; index--) {
            if (!filteredOptions[index].disabled) {
              setActiveIndex(index);
              break;
            }
          }
          break;
        }
        case "PageUp":
          if (!open) return;
          event.preventDefault();
          setActiveIndex(firstEnabledIndex(filteredOptions));
          break;
        case "PageDown": {
          if (!open) return;
          event.preventDefault();
          for (let index = filteredOptions.length - 1; index >= 0; index--) {
            if (!filteredOptions[index].disabled) {
              setActiveIndex(index);
              break;
            }
          }
          break;
        }
        case "Enter":
          if (!open) return;
          event.preventDefault();
          commit(activeIndex);
          break;
        case "Escape":
          if (!open) return;
          event.preventDefault();
          event.stopPropagation();
          close();
          break;
        case "Tab":
          if (open) close();
          break;
        default:
      }
    },
    [disabled, open, moveActive, filteredOptions, commit, activeIndex, close, setOpen, setActiveIndex],
  );
}
