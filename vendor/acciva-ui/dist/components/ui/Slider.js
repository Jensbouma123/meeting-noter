"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useId, useRef, } from "react";
import { SLIDER_ROW_HEIGHT, SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET, SLIDER_TRACK_HEIGHT, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
export function Slider(_a) {
    var { value, min = 0, max = 100, step = 1, label, onChange, formatValue, disabled = false, size = "md", className, "aria-label": ariaLabel } = _a, props = __rest(_a, ["value", "min", "max", "step", "label", "onChange", "formatValue", "disabled", "size", "className", "aria-label"]);
    const trackRef = useRef(null);
    const sliderId = useId();
    const percent = ((value - min) / (max - min)) * 100;
    const clamp = useCallback((v) => Math.min(max, Math.max(min, v)), [min, max]);
    const setFromClientX = useCallback((clientX) => {
        const track = trackRef.current;
        if (!track)
            return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const raw = min + ratio * (max - min);
        const stepped = Math.round(raw / step) * step;
        onChange(clamp(stepped));
    }, [clamp, max, min, onChange, step]);
    const handlePointerDown = (event) => {
        if (disabled)
            return;
        setFromClientX(event.clientX);
        const move = (moveEvent) => setFromClientX(moveEvent.clientX);
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };
    const handleKeyDown = (event) => {
        if (disabled)
            return;
        const big = (max - min) / 10 || step;
        const actions = {
            ArrowRight: value + step,
            ArrowUp: value + step,
            ArrowLeft: value - step,
            ArrowDown: value - step,
            PageUp: value + big,
            PageDown: value - big,
            Home: min,
            End: max,
        };
        if (event.key in actions) {
            event.preventDefault();
            onChange(clamp(actions[event.key]));
        }
    };
    return (_jsxs("div", Object.assign({ className: cn("flex w-full flex-col gap-1.5", className) }, props, { children: [label ? (_jsxs(HStack, { justify: "between", spacing: "none", className: resolveResponsive(size, TEXT_SIZE), children: [_jsx("span", { id: `${sliderId}-label`, className: "font-medium text-foreground", children: label }), _jsx("span", { className: "text-muted-foreground", children: formatValue ? formatValue(value) : value })] })) : null, _jsxs("div", { ref: trackRef, onPointerDown: handlePointerDown, className: cn("relative w-full cursor-pointer touch-none", resolveResponsive(size, SLIDER_ROW_HEIGHT), typeof size === "string"
                    ? touchTargetClass(size)
                    : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                        ? TOUCH_TARGET_CLASS
                        : undefined, disabled && "cursor-not-allowed opacity-60"), children: [_jsx("div", { className: cn("absolute top-1/2 w-full -translate-y-1/2 rounded-full bg-muted-foreground/20", resolveResponsive(size, SLIDER_TRACK_HEIGHT)) }), _jsx("div", { className: cn("absolute top-1/2 -translate-y-1/2 rounded-full bg-primary-500", resolveResponsive(size, SLIDER_TRACK_HEIGHT)), style: { width: `${percent}%` } }), _jsx("div", { role: "slider", tabIndex: disabled ? -1 : 0, "aria-orientation": "horizontal", "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": value, "aria-valuetext": formatValue ? formatValue(value) : undefined, "aria-labelledby": label ? `${sliderId}-label` : undefined, "aria-label": label ? undefined : ariaLabel, "aria-disabled": disabled || undefined, onKeyDown: handleKeyDown, className: cn("focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", resolveResponsive(size, SLIDER_THUMB_TARGET)), style: { left: `${percent}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn("pointer-events-none block rounded-full border-2 border-primary-500 bg-white shadow", resolveResponsive(size, SLIDER_THUMB_SIZE)) }) })] })] })));
}
