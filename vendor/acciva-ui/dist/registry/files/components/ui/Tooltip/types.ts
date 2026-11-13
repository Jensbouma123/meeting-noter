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

export interface TooltipGroupProps {
  children: ReactNode;
  /** ms after the group's bubble closes during which another trigger still opens with no delay. Default `300`. */
  skipDelay?: number;
}

/** What a grouped Tooltip publishes to its group's single bubble while it is open. */
export interface TooltipSlot {
  owner: object;
  id: string;
  anchorName: string;
  content: ReactNode;
  side: TooltipSide;
  maxWidth: number | string;
  triggerRef: React.RefObject<HTMLElement | null>;
  hide: () => void;
  touchOpenRef: React.RefObject<boolean>;
}

/** The bubble as it looked just before a hand-off: the morph starts from here. */
export interface TooltipMorphFrom {
  rect: DOMRect;
  /** The old trigger's rect, the glide's anchor point (`glideOffset`). */
  trigger: DOMRect;
  /** The old bubble's own translate, non-zero when handed off mid-glide. */
  shift: [number, number];
  arrow: string;
  placed: string | undefined;
  content: ReactNode;
}

/** The channel a grouped Tooltip uses to drive its `TooltipGroup`'s single bubble. */
export interface TooltipGroupApi {
  /** True while the group's bubble is open or closed less than `skipDelay` ago: open with no delay. */
  warm: () => boolean;
  publish: (slot: TooltipSlot) => void;
  clear: (owner: object) => void;
  /** Ends a morph: drops the outgoing text layer. */
  settle: () => void;
}
