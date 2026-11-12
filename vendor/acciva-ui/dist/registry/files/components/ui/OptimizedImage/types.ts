import type { ReactNode } from "react";

export type OptimizedImageFit = "cover" | "contain" | "fill" | "none" | "scale-down";
export type OptimizedImageLoader = (src: string, width: number) => string;

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  widths?: readonly number[];
  loader?: OptimizedImageLoader;
  srcSet?: string;
  priority?: boolean;
  fit?: OptimizedImageFit;
  position?: string;
  rootMargin?: string;
  blurDataURL?: string;
  background?: string;
  rounded?: string;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}
