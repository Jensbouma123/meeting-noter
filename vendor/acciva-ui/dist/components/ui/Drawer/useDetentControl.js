import { GROW_KEYS, SHRINK_KEYS } from "./sideTables.js";
import { DRAWER_DETENTS } from "./types.js";
/** Returns `[detent, detentOrder, detentIndex, restSize, commitDetent, onKeyDown, onClick]`. */
export function useDetentControl(controlledDetent, uncontrolledDetent, setUncontrolledDetent, detentSizes, resolvedSide, dragEnabled, onSnapChange, setSettled) {
    const detent = controlledDetent ?? uncontrolledDetent;
    const detentOrder = [detentSizes.peek, detentSizes.half, detentSizes.full];
    const detentIndex = DRAWER_DETENTS.indexOf(detent);
    const restSize = detentOrder[detentIndex];
    const commitDetent = (next) => {
        if (next === detent)
            return;
        if (controlledDetent === undefined)
            setUncontrolledDetent(next);
        setSettled(true);
        onSnapChange?.(detentOrder[DRAWER_DETENTS.indexOf(next)], next);
    };
    const growDetent = () => {
        for (let index = detentIndex + 1; index < DRAWER_DETENTS.length; index += 1) {
            if (detentOrder[index] > restSize)
                return DRAWER_DETENTS[index];
        }
        return undefined;
    };
    const shrinkDetent = () => {
        for (let index = detentIndex - 1; index >= 0; index -= 1) {
            if (detentOrder[index] < restSize)
                return DRAWER_DETENTS[index];
        }
        return undefined;
    };
    const handleHandleKeyDown = (event) => {
        let target;
        if (GROW_KEYS[resolvedSide].includes(event.key))
            target = growDetent();
        else if (SHRINK_KEYS[resolvedSide].includes(event.key))
            target = shrinkDetent();
        else if (event.key === "Home")
            target = "peek";
        else if (event.key === "End")
            target = "full";
        else
            return;
        event.preventDefault();
        if (target === undefined)
            return;
        commitDetent(target);
    };
    const handleHandleClick = () => {
        if (dragEnabled)
            return;
        commitDetent(growDetent() ?? "peek");
    };
    return [detent, detentOrder, detentIndex, restSize, commitDetent, handleHandleKeyDown, handleHandleClick];
}
