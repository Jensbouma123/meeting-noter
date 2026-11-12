import type { IconTileEmphasis, IconTileShape, IconTileSize, IconTileTone } from "@/components/ui/IconTile/types";

// Every pair is a semantic token pair that already adapts to the colour scheme, so no entry
// carries a `dark:` override. Soft pairs are the Badge tone pairs; solid pairs are the
// Button/status fills with their own foreground.
export const ICON_TILE_TONE_CLASS: Record<IconTileEmphasis, Record<IconTileTone, string>> = {
  soft: {
    primary: "bg-badge-primary-background text-badge-primary-foreground",
    secondary: "bg-button-secondary-background text-button-secondary-foreground",
    accent: "bg-button-accent-background text-button-accent-foreground",
    success: "bg-badge-success-background text-badge-success-foreground",
    warning: "bg-badge-warning-background text-badge-warning-foreground",
    danger: "bg-badge-danger-background text-badge-danger-foreground",
    info: "bg-badge-info-background text-badge-info-foreground",
    neutral: "bg-elevation-2 text-muted-foreground",
  },
  solid: {
    primary: "bg-button-primary-background text-button-primary-foreground",
    secondary: "bg-button-secondary-background text-button-secondary-foreground",
    accent: "bg-button-accent-background text-button-accent-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-danger text-danger-foreground",
    info: "bg-info text-info-foreground",
    neutral: "bg-foreground text-background",
  },
};

export const ICON_TILE_SIZE_CLASS: Record<IconTileSize, string> = {
  sm: "size-8 text-xs [&_svg]:size-4",
  md: "size-10 text-sm [&_svg]:size-5",
  lg: "size-12 text-base [&_svg]:size-6",
};

export const ICON_TILE_SHAPE_CLASS: Record<IconTileShape, string> = {
  rounded: "rounded-lg",
  full: "rounded-full",
};
