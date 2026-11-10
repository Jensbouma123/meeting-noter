import { type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { type FrameMaxWidth } from "../../lib/layout-tokens.js";
import { type Spacing, type StackAlign } from "./Stack.js";
export type { FrameMaxWidth };
export interface FrameProps extends HTMLAttributes<HTMLElement> {
    /** Polymorphic element — defaults to `"div"`. */
    as?: ElementType;
    /** Readable-width ceiling for the content, from `FRAME_MAX_WIDTH` in [[styling]]. */
    maxWidth?: FrameMaxWidth;
    /** Padding inside the frame. */
    padding?: Spacing;
    /** Fills the available space (`w-full h-full`). */
    fill?: boolean;
    /** Centres the frame in its parent (`mx-auto`). */
    center?: boolean;
    /** Cross-axis alignment of the content; turns the frame into a flex column. */
    align?: StackAlign;
    /** Framed content. */
    children?: ReactNode;
}
export declare const Frame: import("react").ForwardRefExoticComponent<FrameProps & import("react").RefAttributes<HTMLElement>>;
