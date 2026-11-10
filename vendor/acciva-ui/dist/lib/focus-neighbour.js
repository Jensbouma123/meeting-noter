/**
 * Before a list item is removed, move focus to its next (else previous) sibling's
 * control matching `selector`, so focus is not dropped to `<body>` (SC 2.4.3).
 */
export function focusNeighbour(trigger, selector) {
    const item = trigger.closest("li");
    const neighbour = item?.nextElementSibling ?? item?.previousElementSibling;
    neighbour?.querySelector(selector)?.focus();
}
