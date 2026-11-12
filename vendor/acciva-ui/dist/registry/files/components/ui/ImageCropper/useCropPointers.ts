import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { aspectRatio, type CropAspect, type CropRect } from "@/lib/image/index";
import { clamp } from "@/lib/utils";
import { resizeRect } from "@/components/ui/ImageCropper/geometry";
import type { CropCorner, Drag, Point, Size } from "@/components/ui/ImageCropper/types";

type CropPointersOptions = {
  image: Size | undefined;
  rect: CropRect | undefined;
  aspect: CropAspect;
  minSize: number;
  inert: boolean;
  scale: number;
  zoom: number;
  viewCenter: Point;
  clampCenter: (point: Point) => Point;
  setCenter: (center: Point | null) => void;
  setZoom: (next: number) => void;
  commit: (next: CropRect) => CropRect | undefined;
};

export function useCropPointers({
  image,
  rect,
  aspect,
  minSize,
  inert,
  scale,
  zoom,
  viewCenter,
  clampCenter,
  setCenter,
  setZoom,
  commit,
}: CropPointersOptions) {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (inert || !rect || !scale) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 2) {
      drag.current = { mode: "pinch", distance: pinchDistance(), zoom };
      return;
    }
    if (pointers.current.size > 2) return;
    const part = (event.target as HTMLElement).closest<HTMLElement>("[data-crop-part]");
    const corner = part?.dataset.cropPart as CropCorner | "box" | undefined;
    const start = { x: event.clientX, y: event.clientY, rect };
    if (corner === "box") drag.current = { mode: "move", ...start, center: viewCenter };
    else if (corner) drag.current = { mode: "resize", ...start, corner };
    else if (zoom > 1) drag.current = { mode: "pan", ...start, center: viewCenter };
    else return;
    // Pin the view so the box moves under the pointer instead of the image sliding beneath it.
    setCenter(viewCenter);
    setDragging(drag.current.mode !== "pan");
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!pointers.current.has(event.pointerId) || !current || !image) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (current.mode === "pinch") {
      if (pointers.current.size === 2 && current.distance) setZoom((current.zoom * pinchDistance()) / current.distance);
      return;
    }
    const dx = (event.clientX - current.x) / scale;
    const dy = (event.clientY - current.y) / scale;
    const start = current.rect;
    if (current.mode === "pan") {
      setCenter(clampCenter({ x: current.center.x - dx, y: current.center.y - dy }));
    } else if (current.mode === "move") {
      commit({
        ...start,
        x: Math.round(clamp(start.x + dx, 0, image.width - start.width)),
        y: Math.round(clamp(start.y + dy, 0, image.height - start.height)),
      });
    } else {
      const point = {
        x: (current.corner.endsWith("left") ? start.x : start.x + start.width) + dx,
        y: (current.corner.startsWith("top") ? start.y : start.y + start.height) + dy,
      };
      commit(resizeRect(start, current.corner, point, image, aspectRatio(aspect), minSize, "auto"));
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size === 0 || drag.current?.mode === "pinch") {
      drag.current = null;
      setDragging(false);
    }
  };

  return { dragging, handlePointerDown, handlePointerMove, handlePointerEnd };
}
