"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useRef, useState } from "react";
import { ICON_SIZE_CLASS, INPUT_ICON_INSET, TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { DEFAULT_SEED } from "../../../lib/theme-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { ColorPanel } from "./ColorPanel.js";
import { ColorPickerPopup } from "./ColorPickerPopup.js";
import { triggerClassName } from "./colorPickerClasses.js";
import { DOCKED_MEDIA_QUERY, checkeredFill } from "./colorPickerUtils.js";
import { useColorPickerValue } from "./useColorPickerValue.js";
export const ColorPicker = forwardRef(function ColorPicker({ value, defaultValue = DEFAULT_SEED, onChange, format = "hex", allowAlpha = true, swatches, showEyeDropper = true, label, hint, error, required, disabled = false, readOnly = false, name, id, size = "md", className, onClick, onKeyDown, "aria-describedby": describedBy, ...rest }, forwardedRef) {
    const generatedId = useId();
    const triggerId = id ?? generatedId;
    const labelId = `${triggerId}-label`;
    const valueId = `${triggerId}-value`;
    const hintId = hint && !error ? `${triggerId}-hint` : undefined;
    const errorId = error ? `${triggerId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const triggerRef = useRef(null);
    const { hsva, serialized, displayRgba, commit } = useColorPickerValue({
        value,
        defaultValue,
        onChange,
        format,
        allowAlpha,
    });
    const [surface, setSurface] = useState(null);
    const openPanel = () => {
        if (disabled || readOnly)
            return;
        setSurface(window.matchMedia(DOCKED_MEDIA_QUERY).matches ? "popover" : "drawer");
    };
    const closePanel = () => setSurface(null);
    const panel = (_jsx(ColorPanel, { hsva: hsva, format: format, allowAlpha: allowAlpha, swatches: swatches, showEyeDropper: showEyeDropper, onChange: commit }));
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("label", { id: labelId, htmlFor: triggerId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsxs("button", { ...rest, ref: (node) => {
                    triggerRef.current = node;
                    if (typeof forwardedRef === "function")
                        forwardedRef(node);
                    else if (forwardedRef)
                        forwardedRef.current = node;
                }, id: triggerId, type: "button", disabled: disabled, "aria-haspopup": "dialog", "aria-expanded": surface !== null, "aria-labelledby": label ? `${labelId} ${valueId}` : rest["aria-labelledby"], "aria-describedby": describedByIds, "aria-invalid": error ? true : undefined, onClick: (event) => {
                    onClick?.(event);
                    if (event.defaultPrevented)
                        return;
                    if (surface)
                        closePanel();
                    else
                        openPanel();
                }, onKeyDown: (event) => {
                    onKeyDown?.(event);
                    if (event.key === "ArrowDown" && !surface) {
                        event.preventDefault();
                        openPanel();
                    }
                }, className: triggerClassName(size, disabled, readOnly, error), children: [_jsx("span", { "aria-hidden": "true", className: cn("pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm border border-border", resolveResponsive(size, INPUT_ICON_INSET), resolveResponsive(size, ICON_SIZE_CLASS)), style: checkeredFill(displayRgba) }), _jsx("span", { id: valueId, className: "truncate font-mono", children: serialized })] }), name ? _jsx("input", { type: "hidden", name: name, value: serialized }) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, _jsx(ColorPickerPopup, { surface: surface, panel: panel, triggerRef: triggerRef, onClose: closePanel })] }));
});
