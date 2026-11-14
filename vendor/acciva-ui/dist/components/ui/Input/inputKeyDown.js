// Native search behaviour: Escape clears a non-empty field. A handler that used the key (closing a popup) wins.
export function createInputKeyDown(onKeyDown, searchClearable, hasValue, onClear) {
    return (event) => {
        onKeyDown?.(event);
        if (event.key === "Escape" && !event.defaultPrevented && searchClearable && hasValue) {
            event.preventDefault();
            onClear();
        }
    };
}
