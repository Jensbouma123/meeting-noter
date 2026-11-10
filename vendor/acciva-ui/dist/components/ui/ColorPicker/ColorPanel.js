import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Pipette } from "lucide-react";
import { hslToRgb, hsvToRgb, rgbaToHex, rgbToHsl, rgbToHsv } from "../../../lib/color/formats/index.js";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { Button } from "../Button/index.js";
import { HStack } from "../HStack.js";
import { VStack } from "../VStack.js";
import { ColorPickerEditor } from "./ColorPickerEditor.js";
import { ChannelSlider } from "./ColorPickerSliders.js";
import { Spectrum } from "./ColorPickerSpectrum.js";
import { SwatchGroup } from "./ColorPickerSwatches.js";
import { CHECKERBOARD, CHECKER_TILE, HUE_GRADIENT, checkeredFill, cssColor, resolveSwatches, roundHsla, roundRgba, toHsva, } from "./colorPickerUtils.js";
import { useEyeDropper } from "./useEyeDropper.js";
export function ColorPanel({ hsva, format, allowAlpha, swatches, showEyeDropper, onChange }) {
    const [editorFormat, setEditorFormat] = useState(format);
    const rgba = roundRgba(hsvToRgb(hsva));
    const opaque = cssColor({ ...rgba, a: 1 });
    const rawHsla = rgbToHsl(rgba);
    const hsla = roundHsla(rawHsla.s === 0 ? { ...rawHsla, h: hsva.h } : rawHsla);
    const selectedHex = rgbaToHex(rgba, allowAlpha);
    const commitRgba = (next) => onChange(toHsva(next, hsva.h));
    const commitHsla = (next) => onChange({ ...rgbToHsv(hslToRgb(next)), h: next.h });
    const eyeDropper = useEyeDropper(showEyeDropper, (picked) => commitRgba({ ...picked, a: hsva.a }));
    return (_jsxs(VStack, { spacing: "md", className: cn("w-full text-foreground md:w-72", TEXT_SIZE.sm), children: [_jsx(Spectrum, { hsva: hsva, onChange: onChange }), _jsxs(HStack, { spacing: "sm", children: [_jsxs(VStack, { spacing: "xs", className: "min-w-0 flex-1", children: [_jsx(ChannelSlider, { label: "Hue", value: hsva.h, max: 360, valueText: `${Math.round(hsva.h)} degrees`, trackStyle: { backgroundImage: HUE_GRADIENT }, thumbColor: rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 })), onChange: (h) => onChange({ ...hsva, h }) }), allowAlpha ? (_jsx(ChannelSlider, { label: "Alpha", value: hsva.a * 100, max: 100, valueText: `${Math.round(hsva.a * 100)}%`, trackStyle: {
                                    backgroundImage: `linear-gradient(to right, ${cssColor({ ...rgba, a: 0 })}, ${opaque}), ${CHECKERBOARD}`,
                                    backgroundSize: `100% 100%, ${CHECKER_TILE}`,
                                }, thumbColor: opaque, onChange: (value) => onChange({ ...hsva, a: value / 100 }) })) : null] }), eyeDropper.EyeDropperApi ? (_jsx(Button, { iconOnly: true, tooltip: "Pick color from screen", variant: "outline", size: "sm", onClick: eyeDropper.pickFromScreen, children: _jsx(Pipette, { "aria-hidden": "true" }) })) : null, _jsx("span", { "aria-hidden": "true", className: "size-9 shrink-0 rounded-md border border-border", style: checkeredFill(rgba) })] }), _jsx(ColorPickerEditor, { editorFormat: editorFormat, onEditorFormatChange: setEditorFormat, hsva: hsva, rgba: rgba, hsla: hsla, allowAlpha: allowAlpha, commitRgba: commitRgba, commitHsla: commitHsla, onChange: onChange }), _jsx(SwatchGroup, { caption: "Swatches", swatches: resolveSwatches(swatches), selectedHex: selectedHex, allowAlpha: allowAlpha, onSelect: commitRgba })] }));
}
