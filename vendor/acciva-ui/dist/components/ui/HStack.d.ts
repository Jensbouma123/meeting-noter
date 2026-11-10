import { type ElementType, type ReactElement } from "react";
import type { PolymorphicRef, StackProps } from "./Stack/StackTypes.js";
export type HStackProps<C extends ElementType = "div"> = Omit<StackProps<C>, "direction">;
type HStackComponent = <C extends ElementType = "div">(props: HStackProps<C> & {
    ref?: PolymorphicRef<C>;
}) => ReactElement | null;
export declare const HStack: HStackComponent;
export {};
