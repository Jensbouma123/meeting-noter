import { useEffect } from "react";
/** Keeps the `aria-activedescendant` option of a scrolling listbox in view (SC 2.4.11): focus stays
 * on the input, so the browser never scrolls the list itself. `index` is the option's child index. */
export function useScrollActiveOption(listRef, open, index) {
    useEffect(() => {
        const list = listRef.current;
        const option = list?.children[index];
        if (!open || !list || !option)
            return;
        const top = option.offsetTop;
        const bottom = top + option.offsetHeight;
        if (top < list.scrollTop)
            list.scrollTop = top;
        else if (bottom > list.scrollTop + list.clientHeight)
            list.scrollTop = bottom - list.clientHeight;
    }, [listRef, open, index]);
}
