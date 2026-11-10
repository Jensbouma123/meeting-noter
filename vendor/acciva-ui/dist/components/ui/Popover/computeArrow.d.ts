export type Side = "top" | "bottom" | "left" | "right";
type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">;
/** Side the card landed on and the trigger centre along its edge, in px from the card's top/left. Null until laid out. */
export declare function computeArrow(card: Box, trigger: Box): {
    side: Side;
    offset: number;
} | null;
export {};
