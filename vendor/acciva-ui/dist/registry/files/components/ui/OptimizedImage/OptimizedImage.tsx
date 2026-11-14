"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { buildSrcSet, DEFAULT_WIDTHS, defaultLoader } from "@/components/ui/OptimizedImage/loader";
import { ImageFallback, Placeholder, ShimmerStyle } from "@/components/ui/OptimizedImage/OptimizedImageParts";
import { useIntersectionLoad } from "@/components/ui/OptimizedImage/useIntersectionLoad";
import type { OptimizedImageProps } from "@/components/ui/OptimizedImage/types";

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = "100vw",
  widths = DEFAULT_WIDTHS,
  loader = defaultLoader,
  srcSet,
  priority = false,
  fit = "cover",
  position = "center",
  rootMargin = "200px",
  blurDataURL,
  background,
  rounded = "rounded-xl",
  className,
  imageClassName,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const shouldLoad = useIntersectionLoad(wrapperRef, priority, rootMargin);
  const [prevSrc, setPrevSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(false);
    setFailed(false);
  }

  // A cached or priority image can finish (or fail) before React attaches onLoad/onError,
  // so those events never fire. Check the element's settled state once it is mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (!shouldLoad || !img || !img.complete || !img.getAttribute("src")) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, [shouldLoad, src]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setFailed(true);
    onError?.();
  }, [onError]);

  const wrapperStyle: CSSProperties = {
    aspectRatio: `${width} / ${height}`,
    background: background ?? "var(--elevation-2)",
  };

  const placeholderVisible = !loaded && !failed;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative isolate w-full overflow-hidden", rounded, className)}
      style={wrapperStyle}
    >
      <ShimmerStyle />

      {placeholderVisible ? <Placeholder blurDataURL={blurDataURL} /> : null}

      {failed ? (
        <ImageFallback>{fallback ?? "Image unavailable"}</ImageFallback>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={shouldLoad ? loader(src, width) : undefined}
          srcSet={shouldLoad ? (srcSet ?? buildSrcSet(src, widths, loader)) : undefined}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "absolute inset-0 size-full transition-opacity duration-300 motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          style={{ objectFit: fit, objectPosition: position }}
        />
      )}
    </div>
  );
}
