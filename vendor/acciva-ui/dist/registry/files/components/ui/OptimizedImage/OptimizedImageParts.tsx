import type { ReactNode } from "react";

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
  return (
    <style href={SHIMMER_STYLE_ID} precedence="medium">
      {shimmerCss}
    </style>
  );
}

export function Placeholder({ blurDataURL }: { blurDataURL?: string }) {
  return (
    <>
      {blurDataURL ? (
        <span
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
          style={{ backgroundImage: `url(${blurDataURL})` }}
        />
      ) : null}
      <span aria-hidden className="acciva-image-shimmer absolute inset-0 overflow-hidden" />
    </>
  );
}

export function ImageFallback({ children }: { children: ReactNode }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
      {children}
    </span>
  );
}
