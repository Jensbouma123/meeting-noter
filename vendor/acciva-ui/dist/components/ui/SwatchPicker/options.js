import { parseColor, rgbaToHex } from "../../../lib/color/formats/index.js";
export function resolveOptions(options) {
    return options.flatMap((option, index) => {
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
        return [{ key: `${hex}-${index}`, hex, rgba: rounded, label: entry.label ?? hex }];
    });
}
export function selectionHex(value) {
    if (value === undefined || value === null)
        return null;
    const rgba = parseColor(value);
    return rgba ? rgbaToHex(rgba) : null;
}
