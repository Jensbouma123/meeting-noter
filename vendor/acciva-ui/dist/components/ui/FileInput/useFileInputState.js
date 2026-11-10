import { useCallback, useEffect, useRef, useState } from "react";
export function useFileInputState(value, defaultValue, onChange, fileState, m) {
    const inputRef = useRef(null);
    const rootRef = useRef(null);
    const [internal, setInternal] = useState(defaultValue ?? []);
    const files = value ?? internal;
    const [rejections, setRejections] = useState([]);
    const [announcement, setAnnouncement] = useState("");
    const [processing, setProcessing] = useState(false);
    const [drag, setDrag] = useState(null);
    const [cropSession, setCropSession] = useState(null);
    const [previews, setPreviews] = useState(new Map());
    const originals = useRef(new WeakMap());
    const abortRef = useRef(null);
    const focusAfterRemove = useRef(null);
    const lastStatus = useRef(new WeakMap());
    const commit = useCallback((next, details) => {
        if (value === undefined)
            setInternal(next);
        onChange?.(next, details);
    }, [value, onChange]);
    // Object URLs follow the list: one per listed image, revoked on remove/replace/unmount.
    useEffect(() => {
        const next = new Map();
        for (const f of files)
            if (f.type.startsWith("image/"))
                next.set(f, URL.createObjectURL(f));
        // Object URLs are an external resource that needs cleanup, so they cannot be derived in render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviews(next);
        return () => next.forEach((url) => URL.revokeObjectURL(url));
    }, [files]);
    useEffect(() => () => abortRef.current?.abort(), []);
    // Processed files are written back so native forms (`FormData`, `required`) see them.
    const syncNative = useCallback((list) => {
        const input = inputRef.current;
        if (!input)
            return;
        if (typeof DataTransfer === "undefined") {
            if (list.length === 0)
                input.value = "";
            return;
        }
        const dt = new DataTransfer();
        for (const f of list)
            dt.items.add(f);
        input.files = dt.files;
    }, []);
    useEffect(() => syncNative(files), [files, syncNative]);
    useEffect(() => {
        const index = focusAfterRemove.current;
        if (index === null)
            return;
        focusAfterRemove.current = null;
        const buttons = rootRef.current?.querySelectorAll("[data-file-remove]");
        (buttons?.[index] ?? buttons?.[index - 1] ?? inputRef.current)?.focus();
    }, [files]);
    // Announce upload transitions to done/error (uploading and progress ticks stay silent).
    const states = files.map((f) => fileState?.(f));
    const statusKey = states.map((s) => s?.status ?? "").join("|");
    useEffect(() => {
        const said = [];
        files.forEach((f, i) => {
            const s = states[i];
            const prev = lastStatus.current.get(f);
            if (s?.status !== prev) {
                if (s?.status === "done")
                    said.push(m.uploaded(f.name));
                if (s?.status === "error")
                    said.push(m.failed(f.name, s.error));
            }
            lastStatus.current.set(f, s?.status);
        });
        if (said.length)
            setAnnouncement(said.join(". "));
        // `statusKey` captures every status change; the closure values are read fresh each run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusKey, files]);
    return {
        inputRef,
        rootRef,
        files,
        commit,
        rejections,
        setRejections,
        announcement,
        setAnnouncement,
        processing,
        setProcessing,
        drag,
        setDrag,
        cropSession,
        setCropSession,
        previews,
        states,
        originals,
        abortRef,
        focusAfterRemove,
        syncNative,
    };
}
