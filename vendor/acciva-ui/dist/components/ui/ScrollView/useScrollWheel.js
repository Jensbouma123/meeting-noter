import { useEffect } from "react";
export function useScrollWheel({ isHorizontal, mouseWheel, viewportRef }) {
    useEffect(() => {
        if (!isHorizontal || !mouseWheel)
            return;
        const el = viewportRef.current;
        if (!el)
            return;
        const handleWheel = (event) => {
            if (event.deltaY === 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
                return;
            const maxScrollLeft = el.scrollWidth - el.clientWidth;
            if (maxScrollLeft <= 0)
                return;
            const goingRight = event.deltaY > 0;
            const canScrollInDirection = goingRight ? el.scrollLeft < maxScrollLeft - 1 : el.scrollLeft > 1;
            if (canScrollInDirection) {
                event.preventDefault();
                el.scrollLeft += event.deltaY;
            }
        };
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            el.removeEventListener("wheel", handleWheel);
        };
    }, [isHorizontal, mouseWheel, viewportRef]);
}
