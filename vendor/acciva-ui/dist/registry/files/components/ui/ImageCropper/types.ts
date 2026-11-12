import type { HTMLAttributes } from "react";
import type { CropAspect, CropRect, ImageProcessErrorCode } from "@/lib/image/index";

export type CropCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export interface ImageCropperMessages {
  zoom: string;
  aspect: string;
  aspectLabel: (aspect: CropAspect) => string;
  instructions: string;
  handle: (corner: CropCorner) => string;
  valueText: (rect: CropRect) => string;
  loading: string;
  error: string;
}

export interface ImageCropperProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children" | "onLoad" | "onError"
> {
  source: Blob;
  value?: CropRect;
  defaultValue?: CropRect;
  onChange?: (rect: CropRect) => void;
  aspect?: CropAspect;
  aspectOptions?: readonly CropAspect[];
  onAspectChange?: (aspect: CropAspect) => void;
  zoom?: number;
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  /** Smallest crop edge in source pixels; never larger than the image. */
  minSize?: number;
  onLoad?: (info: { width: number; height: number }) => void;
  onError?: (code: ImageProcessErrorCode) => void;
  label?: string;
  messages?: Partial<ImageCropperMessages>;
  disabled?: boolean;
  className?: string;
}

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export type Drag =
  | { mode: "move"; x: number; y: number; rect: CropRect; center: Point }
  | { mode: "pan"; x: number; y: number; rect: CropRect; center: Point }
  | { mode: "resize"; x: number; y: number; rect: CropRect; corner: CropCorner }
  | { mode: "pinch"; distance: number; zoom: number };
