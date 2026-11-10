import { useEffect, useState, useSyncExternalStore } from "react";
function subscribeNever() {
    return () => { };
}
function getIntersectionObserverSupport() {
    return typeof IntersectionObserver !== "undefined";
}
/** Assume support during SSR/hydration so the client's first render matches the server's. */
function getIntersectionObserverSupportServer() {
    return true;
}
/** True once the wrapper nears the viewport; always true with `priority` or without IntersectionObserver. */
export function useIntersectionLoad(wrapperRef, priority, rootMargin) {
    const supportsIntersectionObserver = useSyncExternalStore(subscribeNever, getIntersectionObserverSupport, getIntersectionObserverSupportServer);
    const [visible, setVisible] = useState(priority);
    useEffect(() => {
        if (priority || visible || !supportsIntersectionObserver)
            return;
        const element = wrapperRef.current;
        if (!element)
            return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [priority, visible, rootMargin, supportsIntersectionObserver, wrapperRef]);
    return visible || !supportsIntersectionObserver;
}
