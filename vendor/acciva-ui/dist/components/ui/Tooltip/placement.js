/** Reads where the bubble actually sits relative to its trigger; `null` before it has a size. */
export function measurePlacement(bubble, trigger) {
    const b = bubble.getBoundingClientRect();
    if (!b.width)
        return null;
    const t = trigger.getBoundingClientRect();
    const above = b.bottom <= t.top;
    const below = b.top >= t.bottom;
    const placed = above ? "top" : below ? "bottom" : b.right <= t.left ? "left" : "right";
    const arrow = `${above || below ? t.x + t.width / 2 - b.x : t.y + t.height / 2 - b.y}px`;
    return { placed, arrow };
}
