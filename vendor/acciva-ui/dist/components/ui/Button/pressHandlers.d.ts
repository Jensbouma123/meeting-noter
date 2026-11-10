import type { MouseEvent } from "react";
import type { useLongPress } from "../../../lib/use-long-press.js";
type Press = ReturnType<typeof useLongPress>;
/** Long-press handlers chained after the caller's own pointer handlers (`own` = the rest props). */
export declare function chainPress(press: Press, own: object): {
    [k: string]: (e: never) => void;
};
/** The click that follows a fired long press is dropped (SC 2.5.2). */
export declare function chainClick(press: Press, onClick: unknown): (e: MouseEvent<HTMLElement>) => void;
export {};
