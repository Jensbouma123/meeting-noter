import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { recordMeasurement } from "./recordMeasurement.js";
export function useVirtualMeasurements({ items, getItemKey, dynamic, scrollRef, firstVisibleRef, baseHeightRef, setScrollTop, }) {
    const observerRef = useRef(null);
    const measuredRef = useRef(new Map());
    const nodesRef = useRef(new Set());
    const scrollCompensationRef = useRef(0);
    const itemsRef = useRef(items);
    const getItemKeyRef = useRef(getItemKey);
    const [measuredSnapshot, setMeasuredSnapshot] = useState(() => new Map());
    // Render-time reset (no setState in an effect): when `items` changes identity the
    // cached heights are stale, because keys can survive reordering.
    const [snapshotItems, setSnapshotItems] = useState(items);
    if (dynamic && snapshotItems !== items) {
        setSnapshotItems(items);
        if (measuredSnapshot.size > 0)
            setMeasuredSnapshot(new Map());
    }
    // Layout effect: runs in the commit, before ResizeObserver callbacks for newly mounted rows.
    useLayoutEffect(() => {
        itemsRef.current = items;
        getItemKeyRef.current = getItemKey;
        measuredRef.current = measuredSnapshot;
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
            if (!Number.isInteger(index) || index >= itemsRef.current.length)
                continue;
            const box = entry.borderBoxSize?.[0];
            const measured = box ? box.blockSize : element.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            const previous = nextMeasured.get(key);
            if (!recordMeasurement(nextMeasured, key, measured))
                continue;
            const before = previous ?? baseHeightRef.current(index);
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
            if (!Number.isInteger(index) || index >= itemsRef.current.length)
                continue;
            const measured = node.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            if (!recordMeasurement(nextMeasured, key, measured))
                continue;
            changed = true;
        }
        if (!changed)
            return;
        measuredRef.current = nextMeasured;
        setMeasuredSnapshot(nextMeasured);
    }, [keyAt]);
    // After the reset commits, re-read mounted nodes: reused nodes get no ResizeObserver callback.
    useLayoutEffect(() => {
        if (dynamic)
            remeasureMountedItems();
    }, [items, dynamic, remeasureMountedItems]);
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
