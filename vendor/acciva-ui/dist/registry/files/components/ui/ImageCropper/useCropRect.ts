import { useMemo } from "react";
import { clampCropRect, type CropAspect, type CropRect } from "@/lib/image/index";
import type { Size } from "@/components/ui/ImageCropper/types";

type CropRectOptions = {
  image: Size | undefined;
  value: CropRect | undefined;
  innerRect: CropRect | undefined;
  aspect: CropAspect;
  minSizeProp: number;
};

export function useCropRect({ image, value, innerRect, aspect, minSizeProp }: CropRectOptions) {
  const minSize = image ? Math.min(minSizeProp, image.width, image.height) : minSizeProp;
  const rawRect = value ?? innerRect;
  const rect = useMemo(
    () => (image && rawRect ? clampCropRect(rawRect, image.width, image.height, aspect, minSize) : undefined),
    [image, rawRect, aspect, minSize],
  );
  return { minSize, rect };
}
