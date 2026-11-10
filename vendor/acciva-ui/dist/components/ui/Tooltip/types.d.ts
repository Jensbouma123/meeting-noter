import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from "react";
export type TooltipSide = "top" | "bottom" | "left" | "right";
export interface TooltipProps {
    content: ReactNode;
    children: ReactElement;
    side?: TooltipSide;
    /** ms to wait before showing on hover/focus. `0` (the default) shows instantly. */
    delay?: number;
    maxWidth?: number | string;
    /** Touch/pen press-and-hold (~500ms) opens the tooltip (SC 1.4.13, 2.5.1, 2.5.2). Default `true`. */
    longPress?: boolean;
}
/** The trigger's own props, read so the wrapper can chain its handlers and refs in front of them. */
export interface TooltipChildProps {
    ref?: React.Ref<HTMLElement>;
    disabled?: boolean;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onPointerCancel?: (e: React.PointerEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    style?: CSSProperties;
}
