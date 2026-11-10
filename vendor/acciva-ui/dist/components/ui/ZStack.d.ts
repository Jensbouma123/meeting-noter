import { type ElementType, type ReactElement } from "react";
import { type PolymorphicProps, type PolymorphicRef, type Spacing } from "./Stack.js";
/** Where every layer sits inside the stack. Logical, so RTL needs no extra work. */
export type ZAlign = "top-leading" | "top" | "top-trailing" | "leading" | "center" | "trailing" | "bottom-leading" | "bottom" | "bottom-trailing";
export interface ZStackOwnProps {
    /** Where every layer sits inside the stack. */
    align?: ZAlign;
    /** Inset padding around the layers. */
    inset?: Spacing;
}
export type ZStackProps<C extends ElementType = "div"> = PolymorphicProps<C, ZStackOwnProps>;
type ZStackComponent = <C extends ElementType = "div">(props: ZStackProps<C> & {
    ref?: PolymorphicRef<C>;
}) => ReactElement | null;
export declare const ZStack: ZStackComponent;
export {};
