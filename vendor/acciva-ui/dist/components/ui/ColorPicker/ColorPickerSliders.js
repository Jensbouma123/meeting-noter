import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET } from "../../../lib/sizing-tokens/index.js";
import { clamp, cn } from "../../../lib/utils.js";
import { LARGE_STEP, THUMB_PAINT, stepFor, trackDrag } from "./colorPickerUtils.js";
export function ChannelSlider({ label, value, max, valueText, trackStyle, thumbColor, onChange }) {
    const trackRef = useRef(null);
    const thumbRef = useRef(null);
    const rounded = Math.round(value);
    const handleKeyDown = (event) => {
        const step = stepFor(event);
        const next = {
            ArrowRight: rounded + step,
            ArrowUp: rounded + step,
            ArrowLeft: rounded - step,
            ArrowDown: rounded - step,
            PageUp: rounded + LARGE_STEP,
            PageDown: rounded - LARGE_STEP,
            Home: 0,
            End: max,
        };
        if (!(event.key in next))
            return;
        event.preventDefault();
        onChange(clamp(next[event.key], 0, max));
    };
    return (_jsxs("div", { ref: trackRef, onPointerDown: (event) => {
            thumbRef.current?.focus();
            trackDrag(event, trackRef.current, (x) => onChange(x * max));
        }, className: "relative h-6 w-full cursor-pointer touch-none", children: [_jsx("div", { "aria-hidden": "true", className: "absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full", style: trackStyle }), _jsx("div", { ref: thumbRef, role: "slider", tabIndex: 0, "aria-label": label, "aria-orientation": "horizontal", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": rounded, "aria-valuetext": valueText, onKeyDown: handleKeyDown, className: cn("focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", SLIDER_THUMB_TARGET.md), style: { left: `${(value / max) * 100}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md), style: { backgroundColor: thumbColor } }) })] }));
}
