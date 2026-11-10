import { useEffect, useState } from "react";
/**
 * The `md` breakpoint (768px, the `AccivaBreakpoint.md` token). Pixel widths
 * apply only while this matches, so a dragged width can never squeeze the
 * stacked phone layout.
 */
const SIDEBY_SIDE_QUERY = "(min-width: 768px)";
export function useSideBySide() {
    const [sideBySide, setSideBySide] = useState(false);
    useEffect(() => {
        const query = window.matchMedia(SIDEBY_SIDE_QUERY);
        const update = () => setSideBySide(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return sideBySide;
}
