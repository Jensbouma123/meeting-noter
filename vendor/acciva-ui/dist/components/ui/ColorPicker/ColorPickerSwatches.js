import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { Check } from "lucide-react";
import { rgbaToHex } from "../../../lib/color/formats/index.js";
import { relativeLuminance } from "../../../lib/color/contrast/index.js";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { LIGHT_GLYPH_LUMINANCE, checkeredFill } from "./colorPickerUtils.js";
export function SwatchGroup({ caption, swatches, selectedHex, allowAlpha, onSelect }) {
    const captionId = useId();
    if (swatches.length === 0)
        return null;
    return (_jsxs(VStack, { spacing: "xs", children: [_jsx("span", { id: captionId, className: cn("font-medium text-muted-foreground", TEXT_SIZE.xs), children: caption }), _jsx("div", { role: "group", "aria-labelledby": captionId, className: "flex flex-wrap gap-2", children: swatches.map(({ label, rgba }) => {
                    const hex = rgbaToHex(rgba, allowAlpha);
                    const selected = hex === selectedHex;
                    const glyphOnLight = relativeLuminance(rgbaToHex(rgba, false)) > LIGHT_GLYPH_LUMINANCE;
                    return (_jsx("button", { type: "button", "aria-pressed": selected, "aria-label": label === hex ? hex : `${label}, ${hex}`, onClick: () => onSelect(allowAlpha ? rgba : { ...rgba, a: 1 }), className: "focus-ring touch-target-44 relative flex size-9 items-center justify-center rounded-md border border-border md:size-7", style: checkeredFill(rgba), children: selected ? (_jsx(Check, { "aria-hidden": "true", className: cn("size-4", glyphOnLight ? "text-neutral-950" : "text-neutral-50") })) : null }, `${label}-${hex}`));
                }) })] }));
}
