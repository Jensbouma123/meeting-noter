"use client";

import { forwardRef, useId, useState } from "react";
import { clamp, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/Slider/index";
import { DEFAULT_MESSAGES } from "@/components/ui/ImageCropper/constants";
import { CropSurface } from "@/components/ui/ImageCropper/ImageCropperParts";
import { CropAspectSwitch, CropStage } from "@/components/ui/ImageCropper/ImageCropperStage";
import type { ImageCropperProps } from "@/components/ui/ImageCropper/types";
import { useCropEdits } from "@/components/ui/ImageCropper/useCropEdits";
import { useCropKeys } from "@/components/ui/ImageCropper/useCropKeys";
import { useCropPointers } from "@/components/ui/ImageCropper/useCropPointers";
import { useCropRect } from "@/components/ui/ImageCropper/useCropRect";
import { useCropSource } from "@/components/ui/ImageCropper/useCropSource";
import { useCropView } from "@/components/ui/ImageCropper/useCropView";

export const ImageCropper = forwardRef<HTMLDivElement, ImageCropperProps>(function ImageCropper(
  {
    source,
    value,
    defaultValue,
    onChange,
    aspect = "free",
    aspectOptions,
    onAspectChange,
    zoom: zoomProp,
    defaultZoom = 1,
    onZoomChange,
    minZoom = 1,
    maxZoom = 4,
    minSize: minSizeProp = 32,
    onLoad,
    onError,
    label = "Crop area",
    messages: messageOverrides,
    disabled = false,
    className,
    ...props
  },
  ref,
) {
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

  const crop =
    image && rect ? (
      <CropSurface
        url={url}
        image={image}
        rect={rect}
        aspect={aspect}
        scale={view.scale}
        viewCenter={view.viewCenter}
        stageSize={view.stageSize}
        inert={inert}
        dragging={pointers.dragging}
        label={label}
        minSize={minSize}
        messages={messages}
        onBoxKeyDown={keys.handleBoxKeyDown}
        onCornerKeyDown={keys.handleCornerKeyDown}
      />
    ) : null;

  const stageNode = (
    <CropStage
      setStage={view.setStage}
      zoom={zoom}
      inert={inert}
      failed={failed}
      crop={crop}
      messages={messages}
      onPointerDown={pointers.handlePointerDown}
      onPointerMove={pointers.handlePointerMove}
      onPointerEnd={pointers.handlePointerEnd}
    />
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      aria-describedby={instructionsId}
      aria-busy={!failed && !crop ? true : undefined}
      className={cn("flex w-full flex-col gap-3", className)}
      {...props}
    >
      <span id={instructionsId} className="sr-only">
        {messages.instructions}
      </span>
      <CropAspectSwitch
        aspect={aspect}
        aspectOptions={aspectOptions}
        inert={inert}
        messages={messages}
        onSelect={edits.selectAspect}
        stage={stageNode}
      />
      <Slider label={messages.zoom} value={zoom} min={minZoom} max={maxZoom} step={0.1} onChange={edits.setZoom} disabled={inert} />
    </div>
  );
});
