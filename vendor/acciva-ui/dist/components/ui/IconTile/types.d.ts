import type { HTMLAttributes, ReactNode } from "react";
export type IconTileTone = "primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export type IconTileSize = "sm" | "md" | "lg";
export type IconTileShape = "rounded" | "full";
export type IconTileEmphasis = "soft" | "solid";
export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    /** An icon, or a short numeral / initials string. Shape `full` suits numerals. */
    children: ReactNode;
    tone?: IconTileTone;
    size?: IconTileSize;
    shape?: IconTileShape;
    emphasis?: IconTileEmphasis;
    /** Names the tile (`role="img"`). Omit it and the tile is decorative (`aria-hidden`). */
    label?: string;
}
