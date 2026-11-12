import { clampCropRect, initialCropRect, type CropAspect, type CropRect } from "@/lib/image/index";
import { clamp } from "@/lib/utils";
import type { ImageCropperProps, Point, Size } from "@/components/ui/ImageCropper/types";

type CropEditOptions = {
  image: Size | undefined;
  aspect: CropAspect;
  aspectOptions: ImageCropperProps["aspectOptions"];
  onAspectChange: ImageCropperProps["onAspectChange"];
  value: CropRect | undefined;
  onChange: ImageCropperProps["onChange"];
  setInnerRect: (rect: CropRect) => void;
  minSize: number;
  zoom: number;
  zoomProp: number | undefined;
  setInnerZoom: (zoom: number) => void;
  minZoom: number;
  maxZoom: number;
  onZoomChange: ImageCropperProps["onZoomChange"];
  setCenter: (center: Point | null) => void;
  view: { halfView: Point; viewCenter: Point; clampCenter: (point: Point) => Point };
};

export function useCropEdits({
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
}: CropEditOptions) {
  const commit = (next: CropRect) => {
    if (!image) return;
    const clamped = clampCropRect(next, image.width, image.height, aspect, minSize);
    if (value === undefined) setInnerRect(clamped);
    onChange?.(clamped);
    return clamped;
  };

  const setZoom = (next: number) => {
    const rounded = Math.round(clamp(next, minZoom, maxZoom) * 10) / 10;
    if (zoomProp === undefined) setInnerZoom(rounded);
    onZoomChange?.(rounded);
    setCenter(null);
  };

  // Keyboard edits keep the box on screen when zoomed in by shifting the view the least amount.
  const reveal = (next: CropRect | undefined) => {
    if (!next || zoom <= 1) return;
    const shift = (c: number, half: number, start: number, size: number) =>
      start < c - half ? start + half : start + size > c + half ? start + size - half : c;
    setCenter(
      view.clampCenter({
        x: shift(view.viewCenter.x, view.halfView.x, next.x, next.width),
        y: shift(view.viewCenter.y, view.halfView.y, next.y, next.height),
      }),
    );
  };

  const selectAspect = (key: string) => {
    const next = aspectOptions?.find((option) => String(option) === key);
    if (next === undefined || !image) return;
    onAspectChange?.(next);
    const recentred = clampCropRect(initialCropRect(image.width, image.height, next), image.width, image.height, next, minSize);
    if (value === undefined) setInnerRect(recentred);
    onChange?.(recentred);
    setCenter(null);
  };

  return { commit, setZoom, reveal, selectAspect };
}
