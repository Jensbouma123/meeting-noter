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
import { forwardRef, useId, useRef, useState, } from "react";
import { Check } from "lucide-react";
import { parseColor, rgbaToHex } from "../../lib/color/formats.js";
import { relativeLuminance } from "../../lib/color/contrast.js";
import { TOUCH_TARGET_CLASS } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { Swatch } from "./Swatch.js";
import { VStack } from "./VStack.js";
const LIGHT_GLYPH_LUMINANCE = 0.179;
function resolveOptions(options) {
    return options.flatMap((option, index) => {
        var _a;
        const entry = typeof option === "string" ? { value: option } : option;
        const rgba = parseColor(entry.value);
        if (!rgba) {
            if (process.env.NODE_ENV !== "production") {
                console.error(`[a11y] <SwatchPicker> dropped unparseable option "${entry.value}" at index ${index}; it is never rendered. Pass a parseColor input (#rgb, #rrggbb, rgb(), hsl(), oklch()).`);
            }
            return [];
        }
        const rounded = {
            r: Math.round(rgba.r),
            g: Math.round(rgba.g),
            b: Math.round(rgba.b),
            a: Math.round(rgba.a * 100) / 100,
        };
        const hex = rgbaToHex(rounded);
        return [{ key: `${hex}-${index}`, hex, rgba: rounded, label: (_a = entry.label) !== null && _a !== void 0 ? _a : hex }];
    });
}
function selectionHex(value) {
    if (value === undefined || value === null)
        return null;
    const rgba = parseColor(value);
    return rgba ? rgbaToHex(rgba) : null;
}
const CHECK_SIZE_CLASS = {
    xs: "size-3",
    sm: "size-3",
    md: "size-4",
    lg: "size-4",
};
export const SwatchPicker = forwardRef(function SwatchPicker(_a, ref) {
    var { options, value, defaultValue = null, onChange, label, hint, error, required = false, disabled = false, name, orientation = "horizontal", size = "md", className, onKeyDown, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy } = _a, rest = __rest(_a, ["options", "value", "defaultValue", "onChange", "label", "hint", "error", "required", "disabled", "name", "orientation", "size", "className", "onKeyDown", "aria-label", "aria-labelledby", "aria-describedby"]);
    const generatedId = useId();
    const labelId = `${generatedId}-label`;
    const hintId = hint && !error ? `${generatedId}-hint` : undefined;
    const errorId = error ? `${generatedId}-error` : undefined;
    const describedByIds = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const resolved = resolveOptions(options);
    const isControlled = value !== undefined;
    const [uncontrolled, setUncontrolled] = useState(defaultValue);
    const current = selectionHex(isControlled ? value : uncontrolled);
    const selectedIndex = resolved.findIndex((option) => option.hex === current);
    const [focusIndex, setFocusIndex] = useState(() => selectedIndex >= 0 ? selectedIndex : 0);
    const activeIndex = selectedIndex >= 0 ? selectedIndex : focusIndex;
    const optionRefs = useRef([]);
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
        onChange === null || onChange === void 0 ? void 0 : onChange(option.hex, { hex: option.hex, rgba: option.rgba, label: option.label });
    };
    const focusOption = (index) => {
        var _a;
        const count = resolved.length;
        if (count === 0)
            return;
        const next = (index + count) % count;
        (_a = optionRefs.current[next]) === null || _a === void 0 ? void 0 : _a.focus();
        select(next);
    };
    const handleKeyDown = (event) => {
        onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(event);
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
                focusOption(resolved.length - 1);
                break;
            default:
                break;
        }
    };
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("span", { id: labelId, className: "text-sm font-medium text-foreground", children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsx("div", Object.assign({}, rest, { ref: ref, role: "radiogroup", "aria-label": label ? undefined : ariaLabel, "aria-labelledby": label ? labelId : ariaLabelledBy, "aria-describedby": describedByIds, "aria-required": required || undefined, "aria-invalid": error ? true : undefined, "aria-orientation": orientation, onKeyDown: handleKeyDown, className: cn("flex", orientation === "horizontal" ? "flex-row flex-wrap gap-3" : "flex-col gap-3"), children: resolved.map((option, index) => {
                    const selected = option.hex === current;
                    const glyphOnLight = relativeLuminance(rgbaToHex(option.rgba, false)) > LIGHT_GLYPH_LUMINANCE;
                    return (_jsxs("button", { ref: (node) => {
                            optionRefs.current[index] = node;
                        }, type: "button", role: "radio", "aria-checked": selected, "aria-label": option.label === option.hex ? option.hex : `${option.label}, ${option.hex}`, tabIndex: index === activeIndex ? 0 : -1, disabled: disabled, onClick: () => select(index), onFocus: () => setFocusIndex(index), className: cn("focus-ring relative flex items-center justify-center rounded-full", TOUCH_TARGET_CLASS, disabled && "cursor-not-allowed opacity-60", selected &&
                            "ring-2 ring-neutral-950 ring-offset-2 ring-offset-background dark:ring-neutral-50"), children: [_jsx(Swatch, { color: option.hex, size: size, "aria-hidden": "true" }), selected ? (_jsx(Check, { "aria-hidden": "true", className: cn("pointer-events-none absolute", CHECK_SIZE_CLASS[size], glyphOnLight ? "text-neutral-950" : "text-neutral-50") })) : null] }, option.key));
                }) })), name && current ? _jsx("input", { type: "hidden", name: name, value: current }) : null, error ? (_jsx("p", { role: "alert", id: errorId, className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null] }));
});
