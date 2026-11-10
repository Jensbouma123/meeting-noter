// Measured geometry goes straight to the element (no re-render): translateX + width animate, top/height snap.
export function placeIndicator(el, tab, variant, left = tab?.offsetLeft ?? 0) {
    if (!el || !tab)
        return;
    el.style.transform = `translateX(${left}px)`;
    el.style.width = `${tab.offsetWidth}px`;
    el.style.top = `${tab.offsetTop + (variant === "underline" ? tab.offsetHeight : 0)}px`;
    if (variant === "pill")
        el.style.height = `${tab.offsetHeight}px`;
}
