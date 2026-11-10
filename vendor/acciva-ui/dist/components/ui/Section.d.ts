import { type HTMLAttributes, type ReactNode } from "react";
import { type Spacing } from "./Stack.js";
/**
 * The header's visual tier, independent of `level`: `level` is the document outline
 * (which `h` tag), `headerSize` is how loud the header looks. The title takes this as its
 * `Heading` size and the description takes the text size paired with it below, so the two
 * always scale together.
 */
export type SectionHeaderSize = "sm" | "md" | "lg" | "xl" | "2xl";
export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    level?: 2 | 3 | 4;
    headerSize?: SectionHeaderSize;
    spacing?: Spacing;
    inset?: Spacing;
    children?: ReactNode;
}
export declare const Section: import("react").ForwardRefExoticComponent<SectionProps & import("react").RefAttributes<HTMLElement>>;
