import { type RefObject } from "react";
declare function useMissingLabelWarningDev(component: string, ref: RefObject<HTMLElement | null>): void;
/**
 * Dev-only, non-blocking: warns once per instance when the rendered element has no text and no
 * aria-label/aria-labelledby/title. Compiles to a no-op in production builds.
 */
export declare const useMissingLabelWarning: typeof useMissingLabelWarningDev;
export {};
