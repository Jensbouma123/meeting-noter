import { useLayoutEffect, useRef, useState } from "react";
import { formatColor, hsvToRgb, rgbaToHex, rgbToHsl } from "../../../lib/color/formats/index.js";
import { clamp } from "../../../lib/utils.js";
import { hsvaFromValue, roundHsla, roundRgba } from "./colorPickerUtils.js";
export function useColorPickerValue({ value, defaultValue, onChange, format, allowAlpha }) {
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const currentValue = isControlled ? value : uncontrolledValue;
    const latestValueRef = useRef(currentValue);
    const [synced, setSynced] = useState(() => ({
        source: currentValue,
        hsva: hsvaFromValue(currentValue, allowAlpha, 0),
    }));
    let hsva = synced.hsva;
    if (synced.source !== currentValue) {
        hsva = hsvaFromValue(currentValue, allowAlpha, synced.hsva.h);
        setSynced({ source: currentValue, hsva });
    }
    useLayoutEffect(() => {
        latestValueRef.current = currentValue;
    });
    const serialized = formatColor(hsvToRgb(hsva), format, { alpha: allowAlpha });
    const displayRgba = roundRgba(hsvToRgb(hsva));
    const commit = (next) => {
        const nextHsva = allowAlpha ? { ...next, a: clamp(next.a, 0, 1) } : { ...next, a: 1 };
        const rgba = roundRgba(hsvToRgb(nextHsva));
        const nextValue = formatColor(rgba, format, { alpha: allowAlpha });
        setSynced({ source: nextValue, hsva: nextHsva });
        if (nextValue === latestValueRef.current)
            return;
        latestValueRef.current = nextValue;
        if (!isControlled)
            setUncontrolledValue(nextValue);
        onChange?.(nextValue, { hex: rgbaToHex(rgba, allowAlpha), rgba, hsla: roundHsla(rgbToHsl(rgba)) });
    };
    return { hsva, serialized, displayRgba, commit };
}
