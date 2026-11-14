import { useState } from "react";
import { selectionHex } from "./options.js";
// Returns a tuple, not an object: property names are not minified, so
// `[current, activeIndex, select, setFocusIndex]` costs fewer bytes than keys.
export function useSwatchSelection(resolved, value, defaultValue, onChange, disabled) {
    const isControlled = value !== undefined;
    const [uncontrolled, setUncontrolled] = useState(defaultValue);
    const current = selectionHex(isControlled ? value : uncontrolled);
    const selectedIndex = resolved.findIndex((option) => option.hex === current);
    const [focusIndex, setFocusIndex] = useState(() => selectedIndex >= 0 ? selectedIndex : 0);
    // Clamp: options can shrink while nothing is selected, and a stale focusIndex must still resolve to a real option.
    const activeIndex = selectedIndex >= 0 ? selectedIndex : Math.min(focusIndex, Math.max(0, resolved.length - 1));
    const select = (index) => {
        if (disabled)
            return;
        const option = resolved[index];
        if (!option)
            return;
        setFocusIndex(index);
        if (option.hex === current)
            return;
        if (!isControlled)
            setUncontrolled(option.hex);
        onChange?.(option.hex, { hex: option.hex, rgba: option.rgba, label: option.label });
    };
    return [current, activeIndex, select, setFocusIndex];
}
