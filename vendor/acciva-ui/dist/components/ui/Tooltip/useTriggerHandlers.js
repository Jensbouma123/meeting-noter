/**
 * Chains the trigger's own handlers in front of the tooltip's: hover/focus reveal it, and any
 * interaction that moves attention away (click, key, pointer down) hides it.
 */
export function useTriggerHandlers(childProps, tooltipRef, show, hide, touch) {
    const own = {
        onMouseEnter: show,
        onFocus: show,
        onBlur: hide,
        onPointerDown: (e) => {
            hide();
            touch.onPointerDown(e);
        },
        onPointerMove: touch.onPointerMove,
        onPointerUp: () => touch.onPointerUp(),
        onPointerCancel: () => touch.onPointerCancel(),
        onContextMenu: touch.onContextMenu,
        // Moving onto the bubble keeps it open: hoverable content (SC 1.4.13).
        onMouseLeave: (e) => {
            const next = e.relatedTarget;
            if (!(next instanceof Node && tooltipRef.current?.contains(next)))
                hide();
        },
        onKeyDown: (e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow"))
                hide();
        },
    };
    const chained = Object.fromEntries(Object.entries(own).map(([name, fn]) => [
        name,
        (e) => {
            childProps[name]?.(e);
            fn(e);
        },
    ]));
    return {
        ...chained,
        onClick: (e) => {
            if (touch.consumeClick()) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            childProps.onClick?.(e);
            hide();
        },
    };
}
