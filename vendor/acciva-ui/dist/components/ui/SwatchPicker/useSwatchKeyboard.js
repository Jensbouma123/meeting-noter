import { rovingIndex } from "../_internal/rovingIndex.js";
// Roving-tabindex keyboard model: arrows and Home/End move focus and selection.
export function useSwatchKeyboard(count, activeIndex, disabled, optionRefs, select, onKeyDown) {
    return (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled)
            return;
        const focused = optionRefs.current.findIndex((node) => node === document.activeElement);
        const next = rovingIndex({
            key: event.key,
            current: focused === -1 ? activeIndex : focused,
            count,
            orientation: "both",
            wrap: true,
        });
        if (next === null)
            return;
        event.preventDefault();
        optionRefs.current[next]?.focus();
        select(next);
    };
}
