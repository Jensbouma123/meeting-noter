"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState } from "react";
import { cn } from "../../../lib/utils.js";
import { buildSrcSet, DEFAULT_WIDTHS, defaultLoader } from "./loader.js";
import { ImageFallback, Placeholder, ShimmerStyle } from "./OptimizedImageParts.js";
import { useIntersectionLoad } from "./useIntersectionLoad.js";
export function OptimizedImage({ src, alt, width, height, sizes = "100vw", widths = DEFAULT_WIDTHS, loader = defaultLoader, srcSet, priority = false, fit = "cover", position = "center", rootMargin = "200px", blurDataURL, background, rounded = "rounded-xl", className, imageClassName, fallback, onLoad, onError, }) {
    const wrapperRef = useRef(null);
    const shouldLoad = useIntersectionLoad(wrapperRef, priority, rootMargin);
    const [prevSrc, setPrevSrc] = useState(src);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    if (src !== prevSrc) {
        setPrevSrc(src);
        setLoaded(false);
        setFailed(false);
    }
    const handleLoad = useCallback(() => {
        setLoaded(true);
        onLoad?.();
    }, [onLoad]);
    const handleError = useCallback(() => {
        setFailed(true);
        onError?.();
    }, [onError]);
    const wrapperStyle = {
        aspectRatio: `${width} / ${height}`,
        background: background ?? "var(--elevation-2)",
    };
    const placeholderVisible = !loaded && !failed;
    return (_jsxs("div", { ref: wrapperRef, className: cn("relative isolate w-full overflow-hidden", rounded, className), style: wrapperStyle, children: [_jsx(ShimmerStyle, {}), placeholderVisible ? _jsx(Placeholder, { blurDataURL: blurDataURL }) : null, failed ? (_jsx(ImageFallback, { children: fallback ?? "Image unavailable" })) : (
            // eslint-disable-next-line @next/next/no-img-element
            _jsx("img", { src: shouldLoad ? loader(src, width) : undefined, srcSet: shouldLoad ? (srcSet ?? buildSrcSet(src, widths, loader)) : undefined, sizes: sizes, alt: alt, width: width, height: height, decoding: "async", loading: priority ? "eager" : "lazy", fetchPriority: priority ? "high" : "auto", onLoad: handleLoad, onError: handleError, className: cn("absolute inset-0 size-full transition-opacity duration-300 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0", imageClassName), style: { objectFit: fit, objectPosition: position } }))] }));
}
