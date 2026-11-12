import type { KeyboardEvent } from "react";
import { aspectRatio, type CropAspect, type CropRect } from "@/lib/image/index";
import { clamp } from "@/lib/utils";
import { ARROWS } from "@/components/ui/ImageCropper/constants";
import { resizeRect } from "@/components/ui/ImageCropper/geometry";
import type { CropCorner, Size } from "@/components/ui/ImageCropper/types";

type CropKeysOptions = {
  image: Size | undefined;
  rect: CropRect | undefined;
  aspect: CropAspect;
  minSize: number;
  inert: boolean;
  commit: (next: CropRect) => CropRect | undefined;
  reveal: (next: CropRect | undefined) => void;
};

export function useCropKeys({ image, rect, aspect, minSize, inert, commit, reveal }: CropKeysOptions) {
  const stepFor = (event: KeyboardEvent) => {
    const base = image ? Math.max(1, Math.round(Math.min(image.width, image.height) / 100)) : 1;
    return event.shiftKey ? base * 10 : base;
  };

  const handleBoxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (inert || !image || !rect) return;
    const maxX = image.width - rect.width;
    const maxY = image.height - rect.height;
    const arrow = ARROWS[event.key];
    const step = stepFor(event);
    const jumps: Record<string, Partial<CropRect>> = {
      Home: { x: 0 },
      End: { x: maxX },
      PageUp: { y: 0 },
      PageDown: { y: maxY },
    };
    const change = arrow ? { x: rect.x + arrow[0] * step, y: rect.y + arrow[1] * step } : jumps[event.key];
    if (!change) return;
    event.preventDefault();
    const moved = { ...rect, ...change };
    reveal(
      commit({
        ...moved,
        x: clamp(moved.x, 0, maxX),
        y: clamp(moved.y, 0, maxY),
      }),
    );
  };

  const handleCornerKeyDown = (corner: CropCorner) => (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROWS[event.key];
    if (inert || !image || !rect || !arrow) return;
    event.preventDefault();
    const step = stepFor(event);
    const point = {
      x: (corner.endsWith("left") ? rect.x : rect.x + rect.width) + arrow[0] * step,
      y: (corner.startsWith("top") ? rect.y : rect.y + rect.height) + arrow[1] * step,
    };
    const ratio = aspectRatio(aspect);
    reveal(commit(resizeRect(rect, corner, point, image, ratio, minSize, arrow[0] ? "x" : "y")));
  };

  return { handleBoxKeyDown, handleCornerKeyDown };
}
