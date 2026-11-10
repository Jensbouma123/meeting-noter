import { useCallback } from "react";
import { firstEnabledIndex } from "./useActiveIndex.js";
/** Keyboard model of the combobox input: arrows move the highlight, Enter commits, Escape and Tab dismiss. */
export function useSearchableKeyDown(disabled, open, setOpen, filteredOptions, activeIndex, setActiveIndex, moveActive, commit, close) {
    return useCallback((event) => {
        if (disabled)
            return;
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                if (!open)
                    setOpen(true);
                else
                    moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                if (!open)
                    setOpen(true);
                else
                    moveActive(-1);
                break;
            case "Home":
                if (!open)
                    return;
                event.preventDefault();
                setActiveIndex(firstEnabledIndex(filteredOptions));
                break;
            case "End": {
                if (!open)
                    return;
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
                if (!open)
                    return;
                event.preventDefault();
                setActiveIndex(firstEnabledIndex(filteredOptions));
                break;
            case "PageDown": {
                if (!open)
                    return;
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
                if (!open)
                    return;
                event.preventDefault();
                commit(activeIndex);
                break;
            case "Escape":
                if (!open)
                    return;
                event.preventDefault();
                event.stopPropagation();
                close();
                break;
            case "Tab":
                if (open)
                    close();
                break;
            default:
        }
    }, [disabled, open, moveActive, filteredOptions, commit, activeIndex, close, setOpen, setActiveIndex]);
}
