/**
 * Before a list item is removed, move focus to its next (else previous) sibling's
 * control matching `selector`, so focus is not dropped to `<body>` (SC 2.4.3).
 */
export function focusNeighbour(trigger, selector) {
    const item = trigger.closest("li");
    if (!item)
        return;
    // Nearest following item with an enabled control, else nearest preceding one.
    // Dividers and headers have no match, so they are skipped rather than ending the search.
    for (const step of ["nextElementSibling", "previousElementSibling"]) {
        for (let sib = item[step]; sib; sib = sib[step]) {
            const control = sib.querySelector(selector);
            if (control) {
                control.focus();
                return;
            }
        }
    }
}
