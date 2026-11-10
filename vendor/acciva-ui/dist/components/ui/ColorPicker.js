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
import { forwardRef, useId, useLayoutEffect, useRef, useState, } from "react";
import { Check, Pipette } from "lucide-react";
import { formatColor, hslToRgb, hsvToRgb, parseColor, rgbaToHex, rgbToHsl, rgbToHsv, } from "../../lib/color/formats.js";
import { relativeLuminance } from "../../lib/color/contrast.js";
import { CONTROL_HEIGHT, CONTROL_RADIUS, ICON_SIZE_CLASS, INPUT_ICON_INSET, INPUT_ICON_PADDING_LEADING, INPUT_PADDING_X, SLIDER_THUMB_SIZE, SLIDER_THUMB_TARGET, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { DEFAULT_SEED } from "../../lib/theme-tokens.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./Button.js";
import { Drawer } from "./Drawer.js";
import { HStack } from "./HStack.js";
import { Input } from "./Input.js";
import { Popover } from "./Popover.js";
import { Tab, TabList, Tabs } from "./Tabs.js";
import { VStack } from "./VStack.js";
const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
const PANEL_TITLE = "Choose color";
const LARGE_STEP = 10;
const LIGHT_GLYPH_LUMINANCE = 0.179;
const FALLBACK_RGBA = parseColor(DEFAULT_SEED);
const FORMATS = ["hex", "rgb", "hsl"];
const HUE_GRADIENT = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
    .map((h) => rgbaToHex(hsvToRgb({ h, s: 100, v: 100, a: 1 })))
    .join(", ")})`;
const CHECKERBOARD = "repeating-conic-gradient(var(--color-neutral-200) 0% 25%, var(--color-neutral-50) 0% 50%)";
const CHECKER_TILE = "calc(var(--spacing) * 4) calc(var(--spacing) * 4)";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function roundRgba({ r, g, b, a }) {
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a * 100) / 100 };
}
function roundHsla({ h, s, l, a }) {
    return { h: Math.round(h) % 360, s: Math.round(s), l: Math.round(l), a };
}
function toHsva(rgba, fallbackHue) {
    const hsva = rgbToHsv(rgba);
    return hsva.s === 0 || hsva.v === 0 ? Object.assign(Object.assign({}, hsva), { h: fallbackHue }) : hsva;
}
function hsvaFromValue(value, allowAlpha, fallbackHue) {
    var _a;
    const rgba = (_a = parseColor(value)) !== null && _a !== void 0 ? _a : FALLBACK_RGBA;
    return toHsva(allowAlpha ? rgba : Object.assign(Object.assign({}, rgba), { a: 1 }), fallbackHue);
}
function cssColor(rgba) {
    return formatColor(rgba, "rgb");
}
function checkeredFill(rgba) {
    const fill = cssColor(rgba);
    return {
        backgroundImage: `linear-gradient(${fill}, ${fill}), ${CHECKERBOARD}`,
        backgroundSize: `100% 100%, ${CHECKER_TILE}`,
    };
}
function resolveSwatches(swatches) {
    if (!swatches)
        return [];
    return swatches.flatMap((swatch) => {
        var _a;
        const entry = typeof swatch === "string" ? { value: swatch } : swatch;
        const rgba = parseColor(entry.value);
        if (!rgba)
            return [];
        const serialized = rgbaToHex(rgba);
        return [{ rgba, label: (_a = entry.label) !== null && _a !== void 0 ? _a : serialized }];
    });
}
function trackDrag(event, element, onPoint) {
    if (!element || event.button !== 0)
        return;
    event.preventDefault();
    const update = (clientX, clientY) => {
        const rect = element.getBoundingClientRect();
        onPoint(clamp((clientX - rect.left) / (rect.width || 1), 0, 1), clamp((clientY - rect.top) / (rect.height || 1), 0, 1));
    };
    update(event.clientX, event.clientY);
    const move = (moveEvent) => update(moveEvent.clientX, moveEvent.clientY);
    const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
}
function stepFor(event) {
    return event.shiftKey ? LARGE_STEP : 1;
}
const THUMB_PAINT = "pointer-events-none block rounded-full border-2 border-neutral-50 shadow ring-1 ring-neutral-950";
function Spectrum({ hsva, onChange }) {
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
        const merged = Object.assign(Object.assign({}, hsva), change);
        onChange(Object.assign(Object.assign({}, merged), { s: clamp(Math.round(merged.s), 0, 100), v: clamp(Math.round(merged.v), 0, 100) }));
    };
    return (_jsxs("div", { ref: areaRef, onPointerDown: (event) => {
            var _a;
            (_a = thumbRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            trackDrag(event, areaRef.current, (x, y) => onChange(Object.assign(Object.assign({}, hsva), { s: x * 100, v: (1 - y) * 100 })));
        }, className: "relative h-48 w-full cursor-crosshair touch-none rounded-md md:h-40", style: { backgroundColor: rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 })) }, children: [_jsx("div", { "aria-hidden": "true", className: "absolute inset-0 rounded-md bg-linear-to-r from-white to-transparent" }), _jsx("div", { "aria-hidden": "true", className: "absolute inset-0 rounded-md bg-linear-to-t from-black to-transparent" }), _jsx("div", { ref: thumbRef, role: "slider", tabIndex: 0, "aria-roledescription": "2D slider", "aria-label": "Saturation and brightness", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": saturation, "aria-valuetext": `Saturation ${saturation}%, brightness ${brightness}%`, onKeyDown: handleKeyDown, className: cn("focus-ring absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", SLIDER_THUMB_TARGET.md), style: { left: `${hsva.s}%`, top: `${100 - hsva.v}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md), style: { backgroundColor: cssColor(Object.assign(Object.assign({}, hsvToRgb(hsva)), { a: 1 })) } }) })] }));
}
function ChannelSlider({ label, value, max, valueText, trackStyle, thumbColor, onChange }) {
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
            var _a;
            (_a = thumbRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            trackDrag(event, trackRef.current, (x) => onChange(x * max));
        }, className: "relative h-6 w-full cursor-pointer touch-none", children: [_jsx("div", { "aria-hidden": "true", className: "absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full", style: trackStyle }), _jsx("div", { ref: thumbRef, role: "slider", tabIndex: 0, "aria-label": label, "aria-orientation": "horizontal", "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": rounded, "aria-valuetext": valueText, onKeyDown: handleKeyDown, className: cn("focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full", SLIDER_THUMB_TARGET.md), style: { left: `${(value / max) * 100}%` }, children: _jsx("span", { "aria-hidden": "true", className: cn(THUMB_PAINT, SLIDER_THUMB_SIZE.md), style: { backgroundColor: thumbColor } }) })] }));
}
const INTEGER_TEXT = /^\d{1,3}$/;
function integerIn(max) {
    return (text) => {
        if (!INTEGER_TEXT.test(text.trim()))
            return null;
        const value = Number(text.trim());
        return value <= max ? value : null;
    };
}
const DRAFT_INPUT_PROPS = { autoComplete: "off", spellCheck: false, size: "sm" };
function ChannelInput({ label, accessibleName, committed, parse, onCommit }) {
    const [draft, setDraft] = useState(null);
    return (_jsx(Input, Object.assign({}, DRAFT_INPUT_PROPS, { label: label, "aria-label": accessibleName, inputMode: "numeric", value: draft !== null && draft !== void 0 ? draft : committed, onChange: (event) => {
            setDraft(event.target.value);
            const parsed = parse(event.target.value);
            if (parsed !== null)
                onCommit(parsed);
        }, onBlur: () => setDraft(null) })));
}
const TYPING_HEX = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;
const BLUR_HEX = /^#?([0-9a-f]{3,4})$/i;
function HexInput({ committed, onCommit }) {
    const [draft, setDraft] = useState(null);
    const commitMatch = (text, pattern) => {
        const match = pattern.exec(text.trim());
        const rgba = match && parseColor(`#${match[1]}`);
        if (rgba)
            onCommit(rgba);
    };
    return (_jsx(Input, Object.assign({}, DRAFT_INPUT_PROPS, { label: "Hex", "aria-label": "Hex", value: draft !== null && draft !== void 0 ? draft : committed, onChange: (event) => {
            setDraft(event.target.value);
            commitMatch(event.target.value, TYPING_HEX);
        }, onBlur: (event) => {
            commitMatch(event.target.value, BLUR_HEX);
            setDraft(null);
        } })));
}
function SwatchGroup({ caption, swatches, selectedHex, allowAlpha, onSelect }) {
    const captionId = useId();
    if (swatches.length === 0)
        return null;
    return (_jsxs(VStack, { spacing: "xs", children: [_jsx("span", { id: captionId, className: cn("font-medium text-muted-foreground", TEXT_SIZE.xs), children: caption }), _jsx("div", { role: "group", "aria-labelledby": captionId, className: "flex flex-wrap gap-2", children: swatches.map(({ label, rgba }) => {
                    const hex = rgbaToHex(rgba, allowAlpha);
                    const selected = hex === selectedHex;
                    const glyphOnLight = relativeLuminance(rgbaToHex(rgba, false)) > LIGHT_GLYPH_LUMINANCE;
                    return (_jsx("button", { type: "button", "aria-pressed": selected, "aria-label": label === hex ? hex : `${label}, ${hex}`, onClick: () => onSelect(allowAlpha ? rgba : Object.assign(Object.assign({}, rgba), { a: 1 })), className: "focus-ring touch-target-44 relative flex size-9 items-center justify-center rounded-md border border-border md:size-7", style: checkeredFill(rgba), children: selected ? (_jsx(Check, { "aria-hidden": "true", className: cn("size-4", glyphOnLight ? "text-neutral-950" : "text-neutral-50") })) : null }, `${label}-${hex}`));
                }) })] }));
}
function ColorPanel({ hsva, format, allowAlpha, swatches, showEyeDropper, onChange }) {
    const [editorFormat, setEditorFormat] = useState(format);
    const [EyeDropperApi] = useState(() => showEyeDropper && typeof window !== "undefined"
        ? window.EyeDropper
        : undefined);
    const rgba = roundRgba(hsvToRgb(hsva));
    const opaque = cssColor(Object.assign(Object.assign({}, rgba), { a: 1 }));
    const rawHsla = rgbToHsl(rgba);
    const hsla = roundHsla(rawHsla.s === 0 ? Object.assign(Object.assign({}, rawHsla), { h: hsva.h }) : rawHsla);
    const selectedHex = rgbaToHex(rgba, allowAlpha);
    const commitRgba = (next) => onChange(toHsva(next, hsva.h));
    const commitHsla = (next) => onChange(Object.assign(Object.assign({}, rgbToHsv(hslToRgb(next))), { h: next.h }));
    const pickFromScreen = () => {
        if (!EyeDropperApi)
            return;
        new EyeDropperApi()
            .open()
            .then(({ sRGBHex }) => {
            const picked = parseColor(sRGBHex);
            if (picked)
                commitRgba(Object.assign(Object.assign({}, picked), { a: hsva.a }));
        })
            .catch(() => undefined);
    };
    const alphaInput = allowAlpha ? (_jsx(ChannelInput, { label: "A", accessibleName: "Alpha", committed: String(Math.round(hsva.a * 100)), parse: integerIn(100), onCommit: (value) => onChange(Object.assign(Object.assign({}, hsva), { a: value / 100 })) })) : null;
    return (_jsxs(VStack, { spacing: "md", className: cn("w-full text-foreground md:w-72", TEXT_SIZE.sm), children: [_jsx(Spectrum, { hsva: hsva, onChange: onChange }), _jsxs(HStack, { spacing: "sm", children: [_jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsx(ChannelSlider, { label: "Hue", value: hsva.h, max: 360, valueText: `${Math.round(hsva.h)} degrees`, trackStyle: { backgroundImage: HUE_GRADIENT }, thumbColor: rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 })), onChange: (h) => onChange(Object.assign(Object.assign({}, hsva), { h })) }), allowAlpha ? (_jsx(ChannelSlider, { label: "Alpha", value: hsva.a * 100, max: 100, valueText: `${Math.round(hsva.a * 100)}%`, trackStyle: {
                                    backgroundImage: `linear-gradient(to right, ${cssColor(Object.assign(Object.assign({}, rgba), { a: 0 }))}, ${opaque}), ${CHECKERBOARD}`,
                                    backgroundSize: `100% 100%, ${CHECKER_TILE}`,
                                }, thumbColor: opaque, onChange: (value) => onChange(Object.assign(Object.assign({}, hsva), { a: value / 100 })) })) : null] }), EyeDropperApi ? (_jsx(Button, { iconOnly: true, tooltip: "Pick color from screen", variant: "outline", size: "sm", onClick: pickFromScreen, children: _jsx(Pipette, { "aria-hidden": "true" }) })) : null, _jsx("span", { "aria-hidden": "true", className: "size-9 shrink-0 rounded-md border border-border", style: checkeredFill(rgba) })] }), _jsx(Tabs, { value: editorFormat, onValueChange: (next) => setEditorFormat(next), variant: "pill", size: "sm", className: "w-full", children: _jsx(TabList, { "aria-label": "Color format", className: "w-full", children: FORMATS.map((option) => (_jsx(Tab, { value: option, className: "flex-1 justify-center", children: option.toUpperCase() }, option))) }) }), _jsxs("div", { className: cn("grid gap-2", allowAlpha ? "grid-cols-4" : "grid-cols-3"), children: [editorFormat === "hex" ? (_jsx("div", { className: "col-span-3", children: _jsx(HexInput, { committed: rgbaToHex(rgba, false), onCommit: (next) => commitRgba(next.a < 1 ? next : Object.assign(Object.assign({}, next), { a: hsva.a })) }) })) : editorFormat === "rgb" ? (["r", "g", "b"].map((channel) => (_jsx(ChannelInput, { label: channel.toUpperCase(), accessibleName: { r: "Red", g: "Green", b: "Blue" }[channel], committed: String(rgba[channel]), parse: integerIn(255), onCommit: (value) => commitRgba(Object.assign(Object.assign({}, rgba), { a: hsva.a, [channel]: value })) }, channel)))) : (["h", "s", "l"].map((channel) => (_jsx(ChannelInput, { label: channel.toUpperCase(), accessibleName: { h: "Hue", s: "Saturation", l: "Lightness" }[channel], committed: String(hsla[channel]), parse: integerIn(channel === "h" ? 360 : 100), onCommit: (value) => commitHsla(Object.assign(Object.assign({}, hsla), { a: hsva.a, [channel]: channel === "h" ? value % 360 : value })) }, channel)))), alphaInput] }), _jsx(SwatchGroup, { caption: "Swatches", swatches: resolveSwatches(swatches), selectedHex: selectedHex, allowAlpha: allowAlpha, onSelect: commitRgba })] }));
}
export const ColorPicker = forwardRef(function ColorPicker(_a, forwardedRef) {
    var { value, defaultValue = DEFAULT_SEED, onChange, format = "hex", allowAlpha = true, swatches, showEyeDropper = true, label, hint, error, required, disabled = false, readOnly = false, name, id, size = "md", className, onClick, onKeyDown, "aria-describedby": describedBy } = _a, rest = __rest(_a, ["value", "defaultValue", "onChange", "format", "allowAlpha", "swatches", "showEyeDropper", "label", "hint", "error", "required", "disabled", "readOnly", "name", "id", "size", "className", "onClick", "onKeyDown", "aria-describedby"]);
    const generatedId = useId();
    const triggerId = id !== null && id !== void 0 ? id : generatedId;
    const labelId = `${triggerId}-label`;
    const valueId = `${triggerId}-value`;
    const hintId = hint && !error ? `${triggerId}-hint` : undefined;
    const errorId = error ? `${triggerId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const triggerRef = useRef(null);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const currentValue = isControlled ? value : uncontrolledValue;
    const latestValueRef = useRef(currentValue);
    const [synced, setSynced] = useState(() => ({
        source: currentValue,
        hsva: hsvaFromValue(currentValue, allowAlpha, 0),
    }));
    const [surface, setSurface] = useState(null);
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
        const nextHsva = allowAlpha ? Object.assign(Object.assign({}, next), { a: clamp(next.a, 0, 1) }) : Object.assign(Object.assign({}, next), { a: 1 });
        const rgba = roundRgba(hsvToRgb(nextHsva));
        const nextValue = formatColor(rgba, format, { alpha: allowAlpha });
        setSynced({ source: nextValue, hsva: nextHsva });
        if (nextValue === latestValueRef.current)
            return;
        latestValueRef.current = nextValue;
        if (!isControlled)
            setUncontrolledValue(nextValue);
        onChange === null || onChange === void 0 ? void 0 : onChange(nextValue, { hex: rgbaToHex(rgba, allowAlpha), rgba, hsla: roundHsla(rgbToHsl(rgba)) });
    };
    const openPanel = () => {
        if (disabled || readOnly)
            return;
        setSurface(window.matchMedia(DOCKED_MEDIA_QUERY).matches ? "popover" : "drawer");
    };
    const closePanel = () => setSurface(null);
    const panel = (_jsx(ColorPanel, { hsva: hsva, format: format, allowAlpha: allowAlpha, swatches: swatches, showEyeDropper: showEyeDropper, onChange: commit }));
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [label ? (_jsxs("label", { id: labelId, htmlFor: triggerId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsxs("button", Object.assign({}, rest, { ref: (node) => {
                    triggerRef.current = node;
                    if (typeof forwardedRef === "function")
                        forwardedRef(node);
                    else if (forwardedRef)
                        forwardedRef.current = node;
                }, id: triggerId, type: "button", disabled: disabled, "aria-haspopup": "dialog", "aria-expanded": surface !== null, "aria-labelledby": label ? `${labelId} ${valueId}` : rest["aria-labelledby"], "aria-describedby": describedByIds, "aria-invalid": error ? true : undefined, onClick: (event) => {
                    onClick === null || onClick === void 0 ? void 0 : onClick(event);
                    if (event.defaultPrevented)
                        return;
                    if (surface)
                        closePanel();
                    else
                        openPanel();
                }, onKeyDown: (event) => {
                    onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(event);
                    if (event.key === "ArrowDown" && !surface) {
                        event.preventDefault();
                        openPanel();
                    }
                }, className: cn("focus-ring relative flex w-full items-center border bg-background text-left text-foreground transition-colors motion-feedback", disabled && "cursor-not-allowed bg-elevation-2 opacity-60", readOnly && "cursor-default bg-elevation-1", error ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, INPUT_PADDING_X), resolveResponsive(size, INPUT_ICON_PADDING_LEADING), typeof size === "string"
                    ? touchTargetClass(size)
                    : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                        ? TOUCH_TARGET_CLASS
                        : undefined), children: [_jsx("span", { "aria-hidden": "true", className: cn("pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm border border-border", resolveResponsive(size, INPUT_ICON_INSET), resolveResponsive(size, ICON_SIZE_CLASS)), style: checkeredFill(displayRgba) }), _jsx("span", { id: valueId, className: "truncate font-mono", children: serialized })] })), name ? _jsx("input", { type: "hidden", name: name, value: serialized }) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, _jsx(Popover, { open: surface === "popover", onOpenChange: (open) => {
                    if (!open)
                        closePanel();
                }, anchorRef: triggerRef, placement: "bottom", dismissOnOutsideClick: true, title: PANEL_TITLE, content: panel }), _jsx(Drawer, { open: surface === "drawer", onOpenChange: (open) => {
                    if (!open)
                        closePanel();
                }, side: "bottom", modality: "modal", "aria-label": PANEL_TITLE, children: surface === "drawer" ? (_jsxs(VStack, { spacing: "md", className: "px-4 pb-4", children: [panel, _jsx(Button, { variant: "primary", size: "lg", className: "w-full justify-center", onClick: closePanel, children: "Done" })] })) : null })] }));
});
