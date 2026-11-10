import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
export function ShimmerStyle() {
    return (_jsx("style", { href: SHIMMER_STYLE_ID, precedence: "medium", children: shimmerCss }));
}
export function Placeholder({ blurDataURL }) {
    return (_jsxs(_Fragment, { children: [blurDataURL ? (_jsx("span", { "aria-hidden": true, className: "absolute inset-0 scale-110 bg-cover bg-center blur-xl", style: { backgroundImage: `url(${blurDataURL})` } })) : null, _jsx("span", { "aria-hidden": true, className: "acciva-image-shimmer absolute inset-0 overflow-hidden" })] }));
}
export function ImageFallback({ children }) {
    return (_jsx("span", { className: "absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground", children: children }));
}
