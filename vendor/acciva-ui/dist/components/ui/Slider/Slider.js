"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { SLIDER_ROW_HEIGHT, SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET, SLIDER_TRACK_HEIGHT, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { SliderLabel } from "./SliderParts.js";
import { useSliderKeys } from "./useSliderKeys.js";
import { useSliderPointer } from "./useSliderPointer.js";
export function Slider({ value, min = 0, max = 100, step = 1, label, onChange, formatValue, disabled = false, size = "md", className, "aria-label": ariaLabel, ...props }) {
    const sliderId = useId();
    const percent = ((value - min) / (max - min)) * 100;
    const range = { min, max, step, disabled, onChange };
    const { trackRef, thumbRef, handlePointerDown } = useSliderPointer(range);
    const handleKeyDown = useSliderKeys({ ...range, value });
    return (_jsxs("div", { className: cn("flex w-full flex-col gap-1.5", className), ...props, children: [label ? (_jsx(SliderLabel, { id: `${sliderId}-label`, label: label, readout: formatValue ? formatValue(value) : value, size: size })) : null, _jsxs("div", { ref: trackRef, onPointerDown: handlePointerDown, className: cn("relative w-full cursor-pointer touch-none", resolveResponsive(size, SLIDER_ROW_HEIGHT), typeof size === "string"
                    ? touchTargetClass(size)
                    : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                        ? TOUCH_TARGET_CLASS
                        : undefined, disabled && "cursor-not-allowed opacity-60"), children: [_jsx("div", { className: cn("absolute top-1/2 w-full -translate-y-1/2 rounded-full bg-muted-foreground/20", resolveResponsive(size, SLIDER_TRACK_HEIGHT)) }), _jsx("div", { className: cn("absolute top-1/2 -translate-y-1/2 rounded-full bg-primary-500", resolveResponsive(size, SLIDER_TRACK_HEIGHT)), style: { width: `${percent}%` } }), _jsx("div", { ref: thumbRef, role: "slider", tabIndex: disabled ? -1 : 0, "aria-orientation": "horizontal", "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": value, "aria-valuetext": formatValue ? formatValue(value) : undefined, "aria-labelledby": label ? `${sliderId}-label` : undefined, "aria-label": label ? undefined : ariaLabel, "aria-disabled": disabled || undefined, onKeyDown: handleKeyDown, className: cn("focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", resolveResponsive(size, SLIDER_THUMB_TARGET)), style: { left: `${percent}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn("pointer-events-none block rounded-full border-2 border-primary-500 bg-white shadow", resolveResponsive(size, SLIDER_THUMB_SIZE)) }) })] })] }));
}
