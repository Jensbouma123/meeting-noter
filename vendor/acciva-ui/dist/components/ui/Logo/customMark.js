import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { resolveHeight } from "./geometry.js";
export function renderCustomMark(size, mark, src, alt, ariaLabel, isAriaHidden, className, rest) {
    const height = resolveHeight(size);
    if (src && !mark) {
        const isDecorative = alt === "" || isAriaHidden;
        return (
        // eslint-disable-next-line @next/next/no-img-element
        _jsx("img", { src: src, alt: isDecorative ? "" : (alt ?? ariaLabel), "aria-hidden": isDecorative ? "true" : undefined, width: height, height: height, className: cn("shrink-0 object-contain", className), ...rest }));
    }
    return (_jsx("span", { role: isAriaHidden ? undefined : "img", "aria-label": isAriaHidden ? undefined : ariaLabel, "aria-hidden": isAriaHidden ? "true" : undefined, className: cn("inline-flex items-center justify-center shrink-0", className), ...rest, children: mark }));
}
