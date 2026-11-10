import { type ElementType, type ReactElement } from "react";
import type { PolymorphicRef, StackProps } from "./StackTypes.js";
/** @internal Takes a precomputed `directionClass` so the responsive resolver stays out of HStack/VStack bundles. */
export type StackBaseProps<C extends ElementType = "div"> = StackProps<C> & {
    directionClass?: string;
};
type StackBaseComponent = <C extends ElementType = "div">(props: StackBaseProps<C> & {
    ref?: PolymorphicRef<C>;
}) => ReactElement | null;
export declare const StackBase: StackBaseComponent;
export {};
