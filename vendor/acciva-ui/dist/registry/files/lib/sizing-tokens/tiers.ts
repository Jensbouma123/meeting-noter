export const SIZE_TIERS = ["xxs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;

export type SizeTier = (typeof SIZE_TIERS)[number];

export type Breakpoint = "sm" | "md" | "lg";

export type ResponsiveSize<T extends string> = T | ({ base: T } & Partial<Record<Breakpoint, T>>);

const RESPONSIVE_BREAKPOINT_ORDER: readonly Breakpoint[] = ["sm", "md", "lg"];

export function resolveResponsive<T extends string>(size: ResponsiveSize<T>, map: Record<T, string>): string {
  if (typeof size === "string") return map[size];
  const parts = map[size.base].split(/\s+/).filter(Boolean);
  for (const breakpoint of RESPONSIVE_BREAKPOINT_ORDER) {
    const tier = size[breakpoint];
    if (tier === undefined) continue;
    for (const cls of map[tier].split(/\s+/).filter(Boolean)) parts.push(`${breakpoint}:${cls}`);
  }
  return parts.join(" ");
}

export const SIZE_LABELS: Record<SizeTier, string> = {
  xxs: "2XS",
  xs: "XS",
  sm: "SM",
  md: "MD",
  lg: "LG",
  xl: "XL",
  "2xl": "2XL",
  "3xl": "3XL",
};
