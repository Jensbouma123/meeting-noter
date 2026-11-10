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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState, } from "react";
import { MAX_DECODE_PIXELS, aspectRatio, clampCropRect, initialCropRect, isCroppable, } from "../../lib/image/index.js";
import { cn } from "../../lib/utils.js";
import { Skeleton } from "./Skeleton.js";
import { Slider } from "./Slider.js";
import { Tab, TabList, TabPanel, Tabs } from "./Tabs.js";
import { Text } from "./Text.js";
const ASPECT_LABELS = {
    free: "Free",
    "1:1": "Square",
    "4:3": "4:3",
    "16:9": "16:9",
    circle: "Circle",
};
const DEFAULT_MESSAGES = {
    zoom: "Zoom",
    aspect: "Aspect ratio",
    aspectLabel: (aspect) => (typeof aspect === "number" ? `${aspect.toFixed(2)}:1` : ASPECT_LABELS[aspect]),
    instructions: "Arrow keys move the crop area. Shift moves further.",
    handle: (corner) => `Resize from ${corner}`,
    valueText: (rect) => `${rect.width} by ${rect.height} pixels at ${rect.x}, ${rect.y}`,
    loading: "Loading image…",
    error: "This image can't be cropped",
};
// DOM order is the Tab order the spec fixes: TL, TR, BR, BL.
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];
const ARROWS = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
/**
 * Resizes `rect` by moving `corner` to `point` while the opposite corner stays put. With a
 * locked ratio the `drive` axis sets the size and the other follows — pointer drags let the
 * larger change win, arrow keys drive the axis they point along.
 */
function resizeRect(rect, corner, point, image, ratio, minSize, drive) {
    const left = corner.endsWith("left");
    const top = corner.startsWith("top");
    const anchorX = left ? rect.x + rect.width : rect.x;
    const anchorY = top ? rect.y + rect.height : rect.y;
    const maxW = left ? anchorX : image.width - anchorX;
    const maxH = top ? anchorY : image.height - anchorY;
    let width = clamp(left ? anchorX - point.x : point.x - anchorX, minSize, maxW);
    let height = clamp(top ? anchorY - point.y : point.y - anchorY, minSize, maxH);
    if (ratio) {
        const axis = drive === "auto" ? (width / height > ratio ? "x" : "y") : drive;
        if (axis === "x")
            height = width / ratio;
        else
            width = height * ratio;
        const fit = Math.min(1, maxW / width, maxH / height);
        width *= fit;
        height *= fit;
    }
    const x = Math.round(left ? anchorX - width : anchorX);
    const y = Math.round(top ? anchorY - height : anchorY);
    return {
        x,
        y,
        width: left ? anchorX - x : Math.round(width),
        height: top ? anchorY - y : Math.round(height),
    };
}
export const ImageCropper = forwardRef(function ImageCropper(_a, ref) {
    var { source, value, defaultValue, onChange, aspect = "free", aspectOptions, onAspectChange, zoom: zoomProp, defaultZoom = 1, onZoomChange, minZoom = 1, maxZoom = 4, minSize: minSizeProp = 32, onLoad, onError, label = "Crop area", messages: messageOverrides, disabled = false, className } = _a, props = __rest(_a, ["source", "value", "defaultValue", "onChange", "aspect", "aspectOptions", "onAspectChange", "zoom", "defaultZoom", "onZoomChange", "minZoom", "maxZoom", "minSize", "onLoad", "onError", "label", "messages", "disabled", "className"]);
    const messages = Object.assign(Object.assign({}, DEFAULT_MESSAGES), messageOverrides);
    const instructionsId = useId();
    const [url, setUrl] = useState();
    const [image, setImage] = useState();
    const [failed, setFailed] = useState(false);
    const [innerRect, setInnerRect] = useState();
    const [innerZoom, setInnerZoom] = useState(defaultZoom);
    // `null` keeps the view centred on the box; a pan or drag pins it to a source point.
    const [center, setCenter] = useState(null);
    const [stage, setStage] = useState(null);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
    const [dragging, setDragging] = useState(false);
    const drag = useRef(null);
    const pointers = useRef(new Map());
    const callbacks = useRef({ onLoad, onError });
    callbacks.current = { onLoad, onError };
    const initial = useRef({ defaultValue, aspect });
    initial.current = { defaultValue, aspect };
    useEffect(() => {
        let cancelled = false;
        setImage(undefined);
        setFailed(false);
        setInnerRect(undefined);
        setCenter(null);
        const fail = (code) => {
            var _a, _b;
            if (cancelled)
                return;
            setFailed(true);
            (_b = (_a = callbacks.current).onError) === null || _b === void 0 ? void 0 : _b.call(_a, code);
        };
        if (!isCroppable(source)) {
            fail("unsupported");
            return;
        }
        const objectUrl = URL.createObjectURL(source);
        setUrl(objectUrl);
        createImageBitmap(source, { imageOrientation: "from-image" }).then((bitmap) => {
            var _a, _b;
            const size = { width: bitmap.width, height: bitmap.height };
            bitmap.close();
            if (cancelled)
                return;
            if (size.width * size.height > MAX_DECODE_PIXELS)
                return fail("too-large");
            const { defaultValue: start, aspect: startAspect } = initial.current;
            setImage(size);
            setInnerRect(start !== null && start !== void 0 ? start : initialCropRect(size.width, size.height, startAspect));
            (_b = (_a = callbacks.current).onLoad) === null || _b === void 0 ? void 0 : _b.call(_a, size);
        }, () => fail("decode"));
        return () => {
            cancelled = true;
            URL.revokeObjectURL(objectUrl);
            setUrl(undefined);
        };
    }, [source]);
    useEffect(() => {
        if (!stage)
            return;
        const measure = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
        measure();
        if (typeof ResizeObserver === "undefined")
            return;
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [stage]);
    const minSize = image ? Math.min(minSizeProp, image.width, image.height) : minSizeProp;
    const rawRect = value !== null && value !== void 0 ? value : innerRect;
    const rect = useMemo(() => (image && rawRect ? clampCropRect(rawRect, image.width, image.height, aspect, minSize) : undefined), [image, rawRect, aspect, minSize]);
    const zoom = clamp(zoomProp !== null && zoomProp !== void 0 ? zoomProp : innerZoom, minZoom, maxZoom);
    const inert = disabled || failed;
    const scale = image ? Math.min(stageSize.width / image.width, stageSize.height / image.height) * zoom : 0;
    const halfView = scale ? { x: stageSize.width / (2 * scale), y: stageSize.height / (2 * scale) } : { x: 0, y: 0 };
    const clampCenter = useCallback((point) => {
        if (!image)
            return point;
        const axis = (value, half, extent) => extent <= 2 * half ? extent / 2 : clamp(value, half, extent - half);
        return {
            x: axis(point.x, halfView.x, image.width),
            y: axis(point.y, halfView.y, image.height),
        };
    }, [image, halfView.x, halfView.y]);
    const viewCenter = clampCenter(center !== null && center !== void 0 ? center : (rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : { x: 0, y: 0 }));
    const commit = (next) => {
        if (!image)
            return;
        const clamped = clampCropRect(next, image.width, image.height, aspect, minSize);
        if (value === undefined)
            setInnerRect(clamped);
        onChange === null || onChange === void 0 ? void 0 : onChange(clamped);
        return clamped;
    };
    const setZoom = (next) => {
        const rounded = Math.round(clamp(next, minZoom, maxZoom) * 10) / 10;
        if (zoomProp === undefined)
            setInnerZoom(rounded);
        onZoomChange === null || onZoomChange === void 0 ? void 0 : onZoomChange(rounded);
        setCenter(null);
    };
    // Keyboard edits keep the box on screen when zoomed in by shifting the view the least amount.
    const reveal = (next) => {
        if (!next || zoom <= 1)
            return;
        const shift = (c, half, start, size) => start < c - half ? start + half : start + size > c + half ? start + size - half : c;
        setCenter(clampCenter({
            x: shift(viewCenter.x, halfView.x, next.x, next.width),
            y: shift(viewCenter.y, halfView.y, next.y, next.height),
        }));
    };
    const selectAspect = (key) => {
        const next = aspectOptions === null || aspectOptions === void 0 ? void 0 : aspectOptions.find((option) => String(option) === key);
        if (next === undefined || !image)
            return;
        onAspectChange === null || onAspectChange === void 0 ? void 0 : onAspectChange(next);
        const recentred = clampCropRect(initialCropRect(image.width, image.height, next), image.width, image.height, next, minSize);
        if (value === undefined)
            setInnerRect(recentred);
        onChange === null || onChange === void 0 ? void 0 : onChange(recentred);
        setCenter(null);
    };
    const stepFor = (event) => {
        const base = image ? Math.max(1, Math.round(Math.min(image.width, image.height) / 100)) : 1;
        return event.shiftKey ? base * 10 : base;
    };
    const handleBoxKeyDown = (event) => {
        if (inert || !image || !rect)
            return;
        const maxX = image.width - rect.width;
        const maxY = image.height - rect.height;
        const arrow = ARROWS[event.key];
        const step = stepFor(event);
        const jumps = {
            Home: { x: 0 },
            End: { x: maxX },
            PageUp: { y: 0 },
            PageDown: { y: maxY },
        };
        const change = arrow ? { x: rect.x + arrow[0] * step, y: rect.y + arrow[1] * step } : jumps[event.key];
        if (!change)
            return;
        event.preventDefault();
        const moved = Object.assign(Object.assign({}, rect), change);
        reveal(commit(Object.assign(Object.assign({}, moved), { x: clamp(moved.x, 0, maxX), y: clamp(moved.y, 0, maxY) })));
    };
    const handleCornerKeyDown = (corner) => (event) => {
        const arrow = ARROWS[event.key];
        if (inert || !image || !rect || !arrow)
            return;
        event.preventDefault();
        const step = stepFor(event);
        const point = {
            x: (corner.endsWith("left") ? rect.x : rect.x + rect.width) + arrow[0] * step,
            y: (corner.startsWith("top") ? rect.y : rect.y + rect.height) + arrow[1] * step,
        };
        const ratio = aspectRatio(aspect);
        reveal(commit(resizeRect(rect, corner, point, image, ratio, minSize, arrow[0] ? "x" : "y")));
    };
    const pinchDistance = () => {
        const [a, b] = [...pointers.current.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const handlePointerDown = (event) => {
        var _a, _b;
        if (inert || !rect || !scale)
            return;
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        (_b = (_a = event.currentTarget).setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId);
        if (pointers.current.size === 2) {
            drag.current = { mode: "pinch", distance: pinchDistance(), zoom };
            return;
        }
        if (pointers.current.size > 2)
            return;
        const part = event.target.closest("[data-crop-part]");
        const corner = part === null || part === void 0 ? void 0 : part.dataset.cropPart;
        const start = { x: event.clientX, y: event.clientY, rect };
        if (corner === "box")
            drag.current = Object.assign(Object.assign({ mode: "move" }, start), { center: viewCenter });
        else if (corner)
            drag.current = Object.assign(Object.assign({ mode: "resize" }, start), { corner });
        else if (zoom > 1)
            drag.current = Object.assign(Object.assign({ mode: "pan" }, start), { center: viewCenter });
        else
            return;
        // Pin the view so the box moves under the pointer instead of the image sliding beneath it.
        setCenter(viewCenter);
        setDragging(drag.current.mode !== "pan");
    };
    const handlePointerMove = (event) => {
        const current = drag.current;
        if (!pointers.current.has(event.pointerId) || !current || !image)
            return;
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (current.mode === "pinch") {
            if (pointers.current.size === 2 && current.distance)
                setZoom((current.zoom * pinchDistance()) / current.distance);
            return;
        }
        const dx = (event.clientX - current.x) / scale;
        const dy = (event.clientY - current.y) / scale;
        const start = current.rect;
        if (current.mode === "pan") {
            setCenter(clampCenter({ x: current.center.x - dx, y: current.center.y - dy }));
        }
        else if (current.mode === "move") {
            commit(Object.assign(Object.assign({}, start), { x: Math.round(clamp(start.x + dx, 0, image.width - start.width)), y: Math.round(clamp(start.y + dy, 0, image.height - start.height)) }));
        }
        else {
            const point = {
                x: (current.corner.endsWith("left") ? start.x : start.x + start.width) + dx,
                y: (current.corner.startsWith("top") ? start.y : start.y + start.height) + dy,
            };
            commit(resizeRect(start, current.corner, point, image, aspectRatio(aspect), minSize, "auto"));
        }
    };
    const handlePointerEnd = (event) => {
        var _a;
        if (!pointers.current.delete(event.pointerId))
            return;
        if (pointers.current.size === 0 || ((_a = drag.current) === null || _a === void 0 ? void 0 : _a.mode) === "pinch") {
            drag.current = null;
            setDragging(false);
        }
    };
    const pct = (part, whole) => `${(part / whole) * 100}%`;
    const crop = image && rect ? (_jsxs("div", { className: "absolute", style: {
            left: stageSize.width / 2 - viewCenter.x * scale,
            top: stageSize.height / 2 - viewCenter.y * scale,
            width: image.width * scale,
            height: image.height * scale,
        }, children: [_jsx("img", { src: url, alt: "", draggable: false, className: "pointer-events-none block size-full select-none" }), _jsx("svg", { "aria-hidden": "true", viewBox: `0 0 ${image.width} ${image.height}`, preserveAspectRatio: "none", className: "pointer-events-none absolute inset-0 size-full fill-neutral-950/50", children: _jsx("path", { fillRule: "evenodd", d: `M0 0H${image.width}V${image.height}H0Z${aspect === "circle"
                        ? `M${rect.x} ${rect.y + rect.height / 2}a${rect.width / 2} ${rect.height / 2} 0 1 0 ${rect.width} 0a${rect.width / 2} ${rect.height / 2} 0 1 0 ${-rect.width} 0Z`
                        : `M${rect.x} ${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`}` }) }), _jsxs("div", { "data-crop-part": "box", role: "slider", tabIndex: inert ? -1 : 0, "aria-roledescription": "crop area", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": image.width - rect.width, "aria-valuenow": rect.x, "aria-valuetext": messages.valueText(rect), "aria-disabled": inert || undefined, onKeyDown: handleBoxKeyDown, className: cn(
                // Light border plus dark ring keeps the outline at 3:1 over any photo (SC 1.4.11).
                "focus-ring absolute border-2 border-neutral-50 ring-1 ring-neutral-950", !inert && "cursor-move"), style: {
                    left: pct(rect.x, image.width),
                    top: pct(rect.y, image.height),
                    width: pct(rect.width, image.width),
                    height: pct(rect.height, image.height),
                }, children: [aspect === "circle" ? (_jsx("span", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0 rounded-full border border-neutral-50" })) : null, dragging ? (_jsxs("span", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0", children: [_jsx("span", { className: "absolute inset-y-0 left-1/3 border-l border-neutral-50/70" }), _jsx("span", { className: "absolute inset-y-0 left-2/3 border-l border-neutral-50/70" }), _jsx("span", { className: "absolute inset-x-0 top-1/3 border-t border-neutral-50/70" }), _jsx("span", { className: "absolute inset-x-0 top-2/3 border-t border-neutral-50/70" })] })) : null] }), CORNERS.map((corner) => (
            // `.touch-target-44` forces `position: relative`, so the corner placement lives on a wrapper.
            _jsx("div", { className: "absolute -translate-x-1/2 -translate-y-1/2", style: {
                    left: pct(corner.endsWith("left") ? rect.x : rect.x + rect.width, image.width),
                    top: pct(corner.startsWith("top") ? rect.y : rect.y + rect.height, image.height),
                }, children: _jsx("div", { "data-crop-part": corner, role: "slider", tabIndex: inert ? -1 : 0, "aria-roledescription": "resize handle", "aria-label": messages.handle(corner), "aria-valuemin": minSize, "aria-valuemax": image.width, "aria-valuenow": rect.width, "aria-valuetext": messages.valueText(rect), "aria-disabled": inert || undefined, onKeyDown: handleCornerKeyDown(corner), className: cn(
                    // 24px paint meets SC 2.5.8; coarse pointers get the 44px hit area on top.
                    "focus-ring touch-target-44 block size-6 rounded-full border-2 border-neutral-950 bg-neutral-50", !inert && (corner === "top-left" || corner === "bottom-right" ? "cursor-nwse-resize" : "cursor-nesw-resize")) }) }, corner)))] })) : null;
    const stageNode = (_jsxs("div", { ref: setStage, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerEnd, onPointerCancel: handlePointerEnd, className: cn("relative h-72 w-full touch-none select-none overflow-hidden rounded-md bg-elevation-2 md:h-96", zoom > 1 && !inert && "cursor-grab"), children: [crop, failed ? (_jsx("div", { className: "absolute inset-0 flex items-center justify-center p-4", children: _jsx(Text, { size: "sm", variant: "danger", align: "center", children: messages.error }) })) : !crop ? (_jsxs(_Fragment, { children: [_jsx(Skeleton, { variant: "rectangular", className: "absolute inset-0 h-full" }), _jsx("span", { className: "sr-only", children: messages.loading })] })) : null] }));
    const options = aspectOptions && aspectOptions.length > 1 ? aspectOptions : undefined;
    return (_jsxs("div", Object.assign({ ref: ref, role: "group", "aria-label": label, "aria-describedby": instructionsId, "aria-busy": !failed && !crop ? true : undefined, className: cn("flex w-full flex-col gap-3", className) }, props, { children: [_jsx("span", { id: instructionsId, className: "sr-only", children: messages.instructions }), options ? (_jsxs(Tabs, { value: String(aspect), onValueChange: selectAspect, size: "sm", children: [_jsx(TabList, { "aria-label": messages.aspect, className: "flex w-full md:w-auto", children: options.map((option) => (_jsx(Tab, { value: String(option), disabled: inert, className: "flex-1 justify-center md:flex-none", children: messages.aspectLabel(option) }, String(option)))) }), options.some((option) => String(option) === String(aspect)) ? (_jsx(TabPanel, { value: String(aspect), className: "mt-3", children: stageNode })) : (_jsx("div", { className: "mt-3", children: stageNode }))] })) : (stageNode), _jsx(Slider, { label: messages.zoom, value: zoom, min: minZoom, max: maxZoom, step: 0.1, onChange: setZoom, disabled: inert })] })));
});
