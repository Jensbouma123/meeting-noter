import { useLayoutEffect, useRef } from "react";
import { rovingIndex, typeaheadIndex } from "./rovingIndex.js";
const TYPEAHEAD_RESET_MS = 500;
/**
 * Roving focus over DOM items (buttons, links, radios): arrows per `orientation`,
 * Home/End, wrap and optional typeahead. Returns the keydown handler for the container.
 */
export function useRovingFocus(options) {
    const { containerRef, itemSelector, orientation, wrap = true, activate = false, typeahead, tabStop } = options;
    const buffer = useRef({ text: "", at: 0 });
    const items = () => Array.from(containerRef.current?.querySelectorAll(itemSelector) ?? []);
    useLayoutEffect(() => {
        if (!tabStop)
            return;
        const all = items();
        const stop = all.find(tabStop) ?? all[0];
        all.forEach((item) => {
            item.tabIndex = item === stop ? 0 : -1;
        });
    });
    return (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey)
            return;
        const list = items();
        const current = list.findIndex((item) => item === document.activeElement);
        if (current === -1)
            return;
        let next = rovingIndex({ key: event.key, current, count: list.length, orientation, wrap });
        if (next === null && typeahead && event.key.length === 1 && event.key !== " ") {
            const now = Date.now();
            const text = (now - buffer.current.at > TYPEAHEAD_RESET_MS ? "" : buffer.current.text) + event.key;
            buffer.current = { text, at: now };
            next = typeaheadIndex(list.map(typeahead), current, text);
        }
        if (next === null)
            return;
        event.preventDefault();
        list[next].focus();
        if (activate)
            list[next].click();
    };
}
