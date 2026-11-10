// Roving-tabindex keyboard model: arrows and Home/End move focus and selection.
export function useSwatchKeyboard(count, activeIndex, disabled, optionRefs, select, onKeyDown) {
    const focusOption = (index) => {
        if (count === 0)
            return;
        const next = (index + count) % count;
        optionRefs.current[next]?.focus();
        select(next);
    };
    return (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled)
            return;
        const currentFocused = optionRefs.current.findIndex((node) => node === document.activeElement);
        const from = currentFocused === -1 ? activeIndex : currentFocused;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                event.preventDefault();
                focusOption(from + 1);
                break;
            case "ArrowLeft":
            case "ArrowUp":
                event.preventDefault();
                focusOption(from - 1);
                break;
            case "Home":
                event.preventDefault();
                focusOption(0);
                break;
            case "End":
                event.preventDefault();
                focusOption(count - 1);
                break;
            default:
                break;
        }
    };
}
