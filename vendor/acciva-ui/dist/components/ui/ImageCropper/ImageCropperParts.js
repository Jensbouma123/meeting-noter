import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { pct } from "./geometry.js";
import { ImageCropperHandles } from "./ImageCropperHandles.js";
export function CropSurface({ url, image, rect, aspect, scale, viewCenter, stageSize, inert, dragging, label, minSize, messages, onBoxKeyDown, onCornerKeyDown, }) {
    return (_jsxs("div", { className: "absolute", style: {
            left: stageSize.width / 2 - viewCenter.x * scale,
            top: stageSize.height / 2 - viewCenter.y * scale,
            width: image.width * scale,
            height: image.height * scale,
        }, children: [_jsx("img", { src: url, alt: "", draggable: false, className: "pointer-events-none block size-full select-none" }), _jsx("svg", { "aria-hidden": "true", viewBox: `0 0 ${image.width} ${image.height}`, preserveAspectRatio: "none", className: "pointer-events-none absolute inset-0 size-full fill-neutral-950/50", children: _jsx("path", { fillRule: "evenodd", d: `M0 0H${image.width}V${image.height}H0Z${aspect === "circle"
                        ? `M${rect.x} ${rect.y + rect.height / 2}a${rect.width / 2} ${rect.height / 2} 0 1 0 ${rect.width} 0a${rect.width / 2} ${rect.height / 2} 0 1 0 ${-rect.width} 0Z`
                        : `M${rect.x} ${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`}` }) }), _jsxs("div", { "data-crop-part": "box", role: "slider", tabIndex: inert ? -1 : 0, "aria-roledescription": "crop area", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": image.width - rect.width, "aria-valuenow": rect.x, "aria-valuetext": messages.valueText(rect), "aria-disabled": inert || undefined, onKeyDown: onBoxKeyDown, className: cn(
                // Light border plus dark ring keeps the outline at 3:1 over any photo (SC 1.4.11).
                "focus-ring absolute border-2 border-neutral-50 ring-1 ring-neutral-950", !inert && "cursor-move"), style: {
                    left: pct(rect.x, image.width),
                    top: pct(rect.y, image.height),
                    width: pct(rect.width, image.width),
                    height: pct(rect.height, image.height),
                }, children: [aspect === "circle" ? (_jsx("span", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0 rounded-full border border-neutral-50" })) : null, dragging ? (_jsxs("span", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0", children: [_jsx("span", { className: "absolute inset-y-0 left-1/3 border-l border-neutral-50/70" }), _jsx("span", { className: "absolute inset-y-0 left-2/3 border-l border-neutral-50/70" }), _jsx("span", { className: "absolute inset-x-0 top-1/3 border-t border-neutral-50/70" }), _jsx("span", { className: "absolute inset-x-0 top-2/3 border-t border-neutral-50/70" })] })) : null] }), _jsx(ImageCropperHandles, { image: image, rect: rect, minSize: minSize, inert: inert, messages: messages, onCornerKeyDown: onCornerKeyDown })] }));
}
