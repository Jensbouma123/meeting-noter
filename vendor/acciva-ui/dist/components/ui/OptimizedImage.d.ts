import { type ReactNode } from "react";
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
export declare function buildSrcSet(src: string, widths: readonly number[], loader: OptimizedImageLoader): string;
export declare function OptimizedImage({ src, alt, width, height, sizes, widths, loader, srcSet, priority, fit, position, rootMargin, blurDataURL, background, rounded, className, imageClassName, fallback, onLoad, onError, }: OptimizedImageProps): import("react").JSX.Element;
