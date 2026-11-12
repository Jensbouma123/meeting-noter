import type { LogoSize, LogoVariant } from "@/components/ui/Logo/types";

const SIZE_MAP: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

export function resolveHeight(size: LogoSize) {
  return typeof size === "number" ? size : SIZE_MAP[size] ?? 32;
}

export function getDimensions(variant: LogoVariant, size: LogoSize) {
  const height = resolveHeight(size);
  switch (variant) {
    case "mark":
      return { width: height, height, viewBox: "0 0 32 32" };
    case "wordmark":
      return { width: Math.round(height * (120 / 32)), height, viewBox: "0 0 120 32" };
    case "full":
    case "responsive":
    default:
      return { width: Math.round(height * (160 / 32)), height, viewBox: "0 0 160 32" };
  }
}
