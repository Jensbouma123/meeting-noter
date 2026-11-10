import { type ElementType, type ReactElement } from "react";
import type { PolymorphicRef, StackProps } from "./Stack/StackTypes.js";
export type VStackProps<C extends ElementType = "div"> = Omit<StackProps<C>, "direction">;
type VStackComponent = <C extends ElementType = "div">(props: VStackProps<C> & {
    ref?: PolymorphicRef<C>;
}) => ReactElement | null;
export declare const VStack: VStackComponent;
export {};
