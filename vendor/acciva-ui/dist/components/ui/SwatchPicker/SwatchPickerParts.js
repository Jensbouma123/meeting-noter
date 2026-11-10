import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { rgbaToHex } from "../../../lib/color/formats/index.js";
import { relativeLuminance } from "../../../lib/color/contrast/index.js";
import { TOUCH_TARGET_CLASS } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { Swatch } from "../Swatch.js";
const LIGHT_GLYPH_LUMINANCE = 0.179;
const CHECK_SIZE_CLASS = {
    xs: "size-3",
    sm: "size-3",
    md: "size-4",
    lg: "size-4",
};
export function SwatchOptionButton({ option, selected, tabbable, disabled, size, buttonRef, onSelect, onFocus, }) {
    const glyphOnLight = relativeLuminance(rgbaToHex(option.rgba, false)) > LIGHT_GLYPH_LUMINANCE;
    return (_jsxs("button", { ref: buttonRef, type: "button", role: "radio", "aria-checked": selected, "aria-label": option.label === option.hex ? option.hex : `${option.label}, ${option.hex}`, tabIndex: tabbable ? 0 : -1, disabled: disabled, onClick: onSelect, onFocus: onFocus, className: cn("focus-ring relative flex items-center justify-center rounded-full", TOUCH_TARGET_CLASS, disabled && "cursor-not-allowed opacity-60", selected &&
            "ring-2 ring-neutral-950 ring-offset-2 ring-offset-background dark:ring-neutral-50"), children: [_jsx(Swatch, { color: option.hex, size: size, "aria-hidden": "true" }), selected ? (_jsx(Check, { "aria-hidden": "true", className: cn("pointer-events-none absolute", CHECK_SIZE_CLASS[size], glyphOnLight ? "text-neutral-950" : "text-neutral-50") })) : null] }));
}
