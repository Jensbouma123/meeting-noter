import { useLayoutEffect } from "react";
import { glideOffset } from "./glideOffset.js";
const px = (n) => `${n}px`;
/** The morph's length: the `--motion-spatial` token (0 under reduced motion), read in ms. */
function spatialMs(el) {
    const value = getComputedStyle(el).getPropertyValue("--motion-spatial").trim();
    const n = parseFloat(value) || 0;
    return value.endsWith("ms") ? n : n * 1000;
}
/**
 * FLIP hand-off for a TooltipGroup's shared bubble. The DOM already shows the new anchor and text;
 * this pins the bubble to the old rect (`data-morph="from"`, no transitions), then releases it
 * (`data-morph="to"`) so CSS transitions `translate`, `width`, `height` and the arrow to the new
 * spot while the text layers cross-fade. A side change fades the bubble in at its new side instead
 * of sliding across the trigger; reduced motion switches instantly. `measure` gives the new size
 * and trigger only while the bubble is anchored to it; without it there is no glide. Positions come
 * from trigger rects (`glideOffset`), never from the bubble's first re-anchored frame.
 */
export function useTooltipMorph(ref, morph, sync, measure) {
    useLayoutEffect(() => {
        const bubble = ref.current;
        const from = morph?.from;
        if (!bubble || !morph || !from)
            return;
        const s = bubble.style;
        const reset = () => {
            bubble.removeAttribute("data-morph");
            s.width = s.height = s.translate = "";
        };
        const settle = () => {
            reset();
            morph.onSettled();
        };
        reset();
        const to = sync();
        if (!to || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
            return settle();
        if (from.placed && from.placed !== to.placed) {
            bubble.setAttribute("data-morph", "swap");
            void bubble.offsetWidth;
            return settle();
        }
        const end = measure();
        if (!end)
            return settle();
        bubble.setAttribute("data-morph", "from");
        s.width = px(from.rect.width);
        s.height = px(from.rect.height);
        s.setProperty("--tooltip-arrow", from.arrow);
        const [dx, dy] = glideOffset(to.placed, from.trigger, end.trigger, from.shift);
        s.translate = `${px(dx)} ${px(dy)}`;
        void bubble.offsetWidth;
        bubble.setAttribute("data-morph", "to");
        s.width = px(end.bubble.width);
        s.height = px(end.bubble.height);
        s.translate = "";
        s.setProperty("--tooltip-arrow", to.arrow);
        const timer = setTimeout(() => {
            settle();
            sync();
        }, spatialMs(bubble));
        return () => clearTimeout(timer);
        // One run per hand-off: the ref is stable and `morph`/`sync` are read fresh for that run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [morph?.seq]);
}
