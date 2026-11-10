import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { hsvToRgb, rgbaToHex } from "../../../lib/color/formats/index.js";
import { SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET } from "../../../lib/sizing-tokens/index.js";
import { clamp, cn } from "../../../lib/utils.js";
import { LARGE_STEP, THUMB_PAINT, cssColor, stepFor, trackDrag } from "./colorPickerUtils.js";
export function Spectrum({ hsva, onChange }) {
    const areaRef = useRef(null);
    const thumbRef = useRef(null);
    const saturation = Math.round(hsva.s);
    const brightness = Math.round(hsva.v);
    const handleKeyDown = (event) => {
        const step = stepFor(event);
        const next = {
            ArrowLeft: { s: hsva.s - step },
            ArrowRight: { s: hsva.s + step },
            ArrowUp: { v: hsva.v + step },
            ArrowDown: { v: hsva.v - step },
            PageUp: { v: hsva.v + LARGE_STEP },
            PageDown: { v: hsva.v - LARGE_STEP },
            Home: { s: 0 },
            End: { s: 100 },
        };
        const change = next[event.key];
        if (!change)
            return;
        event.preventDefault();
        const merged = { ...hsva, ...change };
        onChange({ ...merged, s: clamp(Math.round(merged.s), 0, 100), v: clamp(Math.round(merged.v), 0, 100) });
    };
    return (_jsxs("div", { ref: areaRef, onPointerDown: (event) => {
            thumbRef.current?.focus();
            trackDrag(event, areaRef.current, (x, y) => onChange({ ...hsva, s: x * 100, v: (1 - y) * 100 }));
        }, className: "relative h-48 w-full cursor-crosshair touch-none rounded-md md:h-40", style: { backgroundColor: rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 })) }, children: [_jsx("div", { "aria-hidden": "true", className: "absolute inset-0 rounded-md bg-linear-to-r from-white to-transparent" }), _jsx("div", { "aria-hidden": "true", className: "absolute inset-0 rounded-md bg-linear-to-t from-black to-transparent" }), _jsx("div", { ref: thumbRef, role: "slider", tabIndex: 0, "aria-roledescription": "2D slider", "aria-label": "Saturation and brightness", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": saturation, "aria-valuetext": `Saturation ${saturation}%, brightness ${brightness}%`, onKeyDown: handleKeyDown, className: cn("focus-ring absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", SLIDER_THUMB_TARGET.md), style: { left: `${hsva.s}%`, top: `${100 - hsva.v}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md), style: { backgroundColor: cssColor({ ...hsvToRgb(hsva), a: 1 }) } }) })] }));
}
