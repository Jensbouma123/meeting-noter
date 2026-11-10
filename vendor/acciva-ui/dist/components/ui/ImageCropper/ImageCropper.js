"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useState } from "react";
import { clamp, cn } from "../../../lib/utils.js";
import { Slider } from "../Slider/index.js";
import { DEFAULT_MESSAGES } from "./constants.js";
import { CropSurface } from "./ImageCropperParts.js";
import { CropAspectSwitch, CropStage } from "./ImageCropperStage.js";
import { useCropEdits } from "./useCropEdits.js";
import { useCropKeys } from "./useCropKeys.js";
import { useCropPointers } from "./useCropPointers.js";
import { useCropRect } from "./useCropRect.js";
import { useCropSource } from "./useCropSource.js";
import { useCropView } from "./useCropView.js";
export const ImageCropper = forwardRef(function ImageCropper({ source, value, defaultValue, onChange, aspect = "free", aspectOptions, onAspectChange, zoom: zoomProp, defaultZoom = 1, onZoomChange, minZoom = 1, maxZoom = 4, minSize: minSizeProp = 32, onLoad, onError, label = "Crop area", messages: messageOverrides, disabled = false, className, ...props }, ref) {
    const messages = { ...DEFAULT_MESSAGES, ...messageOverrides };
    const instructionsId = useId();
    const [innerZoom, setInnerZoom] = useState(defaultZoom);
    const { url, image, failed, innerRect, setInnerRect, center, setCenter } = useCropSource({
        source,
        aspect,
        defaultValue,
        onLoad,
        onError,
    });
    const { minSize, rect } = useCropRect({ image, value, innerRect, aspect, minSizeProp });
    const zoom = clamp(zoomProp ?? innerZoom, minZoom, maxZoom);
    const inert = disabled || failed;
    const view = useCropView({ image, rect, zoom, center });
    const edits = useCropEdits({
        image,
        aspect,
        aspectOptions,
        onAspectChange,
        value,
        onChange,
        setInnerRect,
        minSize,
        zoom,
        zoomProp,
        setInnerZoom,
        minZoom,
        maxZoom,
        onZoomChange,
        setCenter,
        view,
    });
    const keys = useCropKeys({ image, rect, aspect, minSize, inert, commit: edits.commit, reveal: edits.reveal });
    const pointers = useCropPointers({
        image,
        rect,
        aspect,
        minSize,
        inert,
        scale: view.scale,
        zoom,
        viewCenter: view.viewCenter,
        clampCenter: view.clampCenter,
        setCenter,
        setZoom: edits.setZoom,
        commit: edits.commit,
    });
    const crop = image && rect ? (_jsx(CropSurface, { url: url, image: image, rect: rect, aspect: aspect, scale: view.scale, viewCenter: view.viewCenter, stageSize: view.stageSize, inert: inert, dragging: pointers.dragging, label: label, minSize: minSize, messages: messages, onBoxKeyDown: keys.handleBoxKeyDown, onCornerKeyDown: keys.handleCornerKeyDown })) : null;
    const stageNode = (_jsx(CropStage, { setStage: view.setStage, zoom: zoom, inert: inert, failed: failed, crop: crop, messages: messages, onPointerDown: pointers.handlePointerDown, onPointerMove: pointers.handlePointerMove, onPointerEnd: pointers.handlePointerEnd }));
    return (_jsxs("div", { ref: ref, role: "group", "aria-label": label, "aria-describedby": instructionsId, "aria-busy": !failed && !crop ? true : undefined, className: cn("flex w-full flex-col gap-3", className), ...props, children: [_jsx("span", { id: instructionsId, className: "sr-only", children: messages.instructions }), _jsx(CropAspectSwitch, { aspect: aspect, aspectOptions: aspectOptions, inert: inert, messages: messages, onSelect: edits.selectAspect, stage: stageNode }), _jsx(Slider, { label: messages.zoom, value: zoom, min: minZoom, max: maxZoom, step: 0.1, onChange: edits.setZoom, disabled: inert })] }));
});
