export type Side = "top" | "bottom" | "left" | "right";
type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">;

/** Side the card landed on and the trigger centre along its edge, in px from the card's top/left. Null until laid out. */
export function computeArrow(card: Box, trigger: Box): { side: Side; offset: number } | null {
  if (!card.width) return null;
  const x = trigger.left + trigger.width / 2 - card.left;
  const y = trigger.top + trigger.height / 2 - card.top;
  if (card.bottom <= trigger.top) return { side: "top", offset: x };
  if (card.top >= trigger.bottom) return { side: "bottom", offset: x };
  if (card.right <= trigger.left) return { side: "left", offset: y };
  if (card.left >= trigger.right) return { side: "right", offset: y };
  return null;
}
