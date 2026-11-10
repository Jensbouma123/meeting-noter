import { type RefObject } from "react";
interface UseScrollWheelOptions {
    isHorizontal: boolean;
    mouseWheel: boolean;
    viewportRef: RefObject<HTMLDivElement | null>;
}
export declare function useScrollWheel({ isHorizontal, mouseWheel, viewportRef }: UseScrollWheelOptions): void;
export {};
