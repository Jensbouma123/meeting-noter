import { type RefObject } from "react";
/** True once the wrapper nears the viewport; always true with `priority` or without IntersectionObserver. */
export declare function useIntersectionLoad(wrapperRef: RefObject<HTMLDivElement | null>, priority: boolean, rootMargin: string): boolean;
