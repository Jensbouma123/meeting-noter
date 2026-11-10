import { useEffect, useState } from "react";
/** Snap order for the current shape; the index is what drag and the arrow keys step through. */
export function snapOrder(halfDetent) {
    return halfDetent ? ["peek", "half", "full"] : ["peek", "full"];
}
/**
 * Controlled/uncontrolled snap. Precedence: `snap`, then `open`, then the internal snap
 * (from `defaultSnap`, else `defaultOpen`). The internal snap remembers `half` vs `full`; a
 * controlled `open` only decides whether it is collapsed, and `open={true}` from `peek` lands
 * on the first open snap (`half` with `halfDetent`, else `full`). `half` without `halfDetent`
 * clamps to `full`.
 */
export function useSnapState({ snap: snapProp, defaultSnap, open, defaultOpen, halfDetent, onOpenChange, onSnapChange, heightOf }) {
    const order = snapOrder(halfDetent);
    const firstOpen = order[1];
    const [internal, setInternal] = useState(defaultSnap ?? (defaultOpen ? firstOpen : "peek"));
    const clamp = (s) => (order.includes(s) ? s : "full");
    const known = clamp(internal);
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (snapProp !== undefined && open !== undefined)
            console.warn("BottomNavDrawer: `snap` and `open` were both passed; `snap` wins.");
        if (snapProp === "half" && !halfDetent)
            console.warn('BottomNavDrawer: snap="half" needs `halfDetent`; using "full".');
    }, [snapProp, open, halfDetent]);
    let snap = known;
    if (snapProp !== undefined)
        snap = clamp(snapProp);
    else if (open === false)
        snap = "peek";
    else if (open === true && known === "peek")
        snap = firstOpen;
    const setSnap = (next) => {
        if (next === snap)
            return;
        setInternal(next);
        onSnapChange?.(next, heightOf(next));
        if ((next !== "peek") !== (snap !== "peek"))
            onOpenChange?.(next !== "peek");
    };
    return { snap, order, setSnap };
}
