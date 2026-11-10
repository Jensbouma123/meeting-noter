import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MEASUREMENT_EPSILON } from "./constants.js";
export function useVirtualMeasurements({ items, getItemKey, dynamic, scrollRef, firstVisibleRef, baseHeightRef, setScrollTop, }) {
    const observerRef = useRef(null);
    const measuredRef = useRef(new Map());
    const nodesRef = useRef(new Set());
    const scrollCompensationRef = useRef(0);
    const itemsRef = useRef(items);
    const getItemKeyRef = useRef(getItemKey);
    const [measuredSnapshot, setMeasuredSnapshot] = useState(() => new Map());
    useEffect(() => {
        itemsRef.current = items;
        getItemKeyRef.current = getItemKey;
    });
    const keyAt = useCallback((index) => {
        const currentItems = itemsRef.current;
        const currentGetItemKey = getItemKeyRef.current;
        return currentGetItemKey ? currentGetItemKey(currentItems[index], index) : index;
    }, []);
    const handleResizeEntries = useCallback((entries) => {
        let changed = false;
        let compensation = 0;
        const firstVisible = firstVisibleRef.current;
        const nextMeasured = new Map(measuredRef.current);
        for (const entry of entries) {
            const element = entry.target;
            const index = Number(element.dataset.index);
            if (!Number.isInteger(index))
                continue;
            const box = entry.borderBoxSize?.[0];
            const measured = box ? box.blockSize : element.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            const previous = nextMeasured.get(key);
            if (previous !== undefined && Math.abs(previous - measured) < MEASUREMENT_EPSILON)
                continue;
            const before = previous ?? baseHeightRef.current(index);
            nextMeasured.set(key, measured);
            changed = true;
            if (index < firstVisible)
                compensation += measured - before;
        }
        if (!changed)
            return;
        measuredRef.current = nextMeasured;
        scrollCompensationRef.current += compensation;
        setMeasuredSnapshot(nextMeasured);
    }, [keyAt, baseHeightRef, firstVisibleRef]);
    const registerItem = useCallback((node) => {
        if (!node || !dynamic || typeof ResizeObserver === "undefined")
            return;
        if (!observerRef.current)
            observerRef.current = new ResizeObserver(handleResizeEntries);
        const observer = observerRef.current;
        const nodes = nodesRef.current;
        nodes.add(node);
        observer.observe(node);
        return () => {
            nodes.delete(node);
            observer.unobserve(node);
        };
    }, [dynamic, handleResizeEntries]);
    const remeasureMountedItems = useCallback(() => {
        let changed = false;
        const nextMeasured = new Map(measuredRef.current);
        for (const node of nodesRef.current) {
            const index = Number(node.dataset.index);
            if (!Number.isInteger(index))
                continue;
            const measured = node.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            const previous = nextMeasured.get(key);
            if (previous !== undefined && Math.abs(previous - measured) < MEASUREMENT_EPSILON)
                continue;
            nextMeasured.set(key, measured);
            changed = true;
        }
        if (!changed)
            return;
        measuredRef.current = nextMeasured;
        setMeasuredSnapshot(nextMeasured);
    }, [keyAt]);
    const measureAll = useCallback(() => {
        measuredRef.current = new Map();
        setMeasuredSnapshot(new Map());
        remeasureMountedItems();
    }, [remeasureMountedItems]);
    useEffect(() => () => {
        observerRef.current?.disconnect();
        observerRef.current = null;
    }, []);
    useLayoutEffect(() => {
        const delta = scrollCompensationRef.current;
        if (delta === 0)
            return;
        scrollCompensationRef.current = 0;
        const element = scrollRef.current;
        if (!element)
            return;
        element.scrollTop += delta;
        setScrollTop(element.scrollTop);
    }, [measuredSnapshot, scrollRef, setScrollTop]);
    return { measuredSnapshot, registerItem, measureAll };
}
