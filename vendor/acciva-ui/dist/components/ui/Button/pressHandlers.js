const KEYS = ["onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onContextMenu"];
/** Long-press handlers chained after the caller's own pointer handlers (`own` = the rest props). */
export function chainPress(press, own) {
    return Object.fromEntries(KEYS.map((key) => [
        key,
        (e) => {
            own[key]?.(e);
            press[key](e);
        },
    ]));
}
/** The click that follows a fired long press is dropped (SC 2.5.2). */
export function chainClick(press, onClick) {
    return (e) => {
        if (press.consumeClick()) {
            e.preventDefault();
            return;
        }
        onClick?.(e);
    };
}
