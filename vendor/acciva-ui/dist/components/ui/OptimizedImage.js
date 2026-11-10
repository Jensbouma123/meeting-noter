"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, } from "react";
import { cn } from "../../lib/utils.js";
const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920];
const SHIMMER_STYLE_ID = "acciva-optimized-image";
const shimmerCss = `
@keyframes acciva-image-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
.acciva-image-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--color-neutral-50) 75%, transparent) 50%,
    transparent 100%
  );
  animation: acciva-image-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .acciva-image-shimmer::after { animation: none; }
}
`;
/** Default loader appends a `w` query param, which every mainstream CDN honours. */
function defaultLoader(src, width) {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}w=${width}`;
}
function subscribeNever() {
    return () => { };
}
function getIntersectionObserverSupport() {
    return typeof IntersectionObserver !== "undefined";
}
/** Assume support during SSR/hydration so the client's first render matches the server's. */
function getIntersectionObserverSupportServer() {
    return true;
}
export function buildSrcSet(src, widths, loader) {
    return widths.map((width) => `${loader(src, width)} ${width}w`).join(", ");
}
export function OptimizedImage({ src, alt, width, height, sizes = "100vw", widths = DEFAULT_WIDTHS, loader = defaultLoader, srcSet, priority = false, fit = "cover", position = "center", rootMargin = "200px", blurDataURL, background, rounded = "rounded-xl", className, imageClassName, fallback, onLoad, onError, }) {
    const wrapperRef = useRef(null);
    const supportsIntersectionObserver = useSyncExternalStore(subscribeNever, getIntersectionObserverSupport, getIntersectionObserverSupportServer);
    const [visible, setVisible] = useState(priority);
    const [prevSrc, setPrevSrc] = useState(src);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    if (src !== prevSrc) {
        setPrevSrc(src);
        setLoaded(false);
        setFailed(false);
    }
    const shouldLoad = visible || !supportsIntersectionObserver;
    useEffect(() => {
        if (priority || visible || !supportsIntersectionObserver)
            return;
        const element = wrapperRef.current;
        if (!element)
            return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [priority, visible, rootMargin, supportsIntersectionObserver]);
    const handleLoad = useCallback(() => {
        setLoaded(true);
        onLoad === null || onLoad === void 0 ? void 0 : onLoad();
    }, [onLoad]);
    const handleError = useCallback(() => {
        setFailed(true);
        onError === null || onError === void 0 ? void 0 : onError();
    }, [onError]);
    const wrapperStyle = {
        aspectRatio: `${width} / ${height}`,
        background: background !== null && background !== void 0 ? background : "var(--elevation-2)",
    };
    const placeholderVisible = !loaded && !failed;
    return (_jsxs("div", { ref: wrapperRef, className: cn("relative isolate w-full overflow-hidden", rounded, className), style: wrapperStyle, children: [_jsx("style", { href: SHIMMER_STYLE_ID, precedence: "medium", children: shimmerCss }), blurDataURL && placeholderVisible ? (_jsx("span", { "aria-hidden": true, className: "absolute inset-0 scale-110 bg-cover bg-center blur-xl", style: { backgroundImage: `url(${blurDataURL})` } })) : null, placeholderVisible ? (_jsx("span", { "aria-hidden": true, className: "acciva-image-shimmer absolute inset-0 overflow-hidden" })) : null, failed ? (_jsx("span", { className: "absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground", children: fallback !== null && fallback !== void 0 ? fallback : "Image unavailable" })) : (
            // eslint-disable-next-line @next/next/no-img-element
            _jsx("img", { src: shouldLoad ? loader(src, width) : undefined, srcSet: shouldLoad ? (srcSet !== null && srcSet !== void 0 ? srcSet : buildSrcSet(src, widths, loader)) : undefined, sizes: sizes, alt: alt, width: width, height: height, decoding: "async", loading: priority ? "eager" : "lazy", fetchPriority: priority ? "high" : "auto", onLoad: handleLoad, onError: handleError, className: cn("absolute inset-0 size-full transition-opacity duration-300 motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0", imageClassName), style: { objectFit: fit, objectPosition: position } }))] }));
}
