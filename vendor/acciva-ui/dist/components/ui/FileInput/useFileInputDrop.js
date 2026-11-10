import { matchesAccept, resolveAccept } from "../../../lib/image/index.js";
export function useFileInputDrop(state, c, addFiles) {
    const { inputRef, setDrag } = state;
    const { accept, disabled } = c;
    const resolvedAccept = resolveAccept(accept);
    const onDragOver = (event) => {
        event.preventDefault();
        if (disabled)
            return;
        // MIME types are visible during the drag; extension tokens are not, so only judge pure-MIME lists.
        const types = Array.from(event.dataTransfer.items ?? [], (item) => item.type);
        const judgeable = resolvedAccept && !resolvedAccept.includes(".") && types.length > 0 && types.every(Boolean);
        const ok = !judgeable || types.some((type) => matchesAccept({ name: "", type }, accept));
        setDrag(ok ? "accept" : "reject");
    };
    const onDragLeave = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
            setDrag(null);
    };
    const onDrop = (event) => {
        event.preventDefault();
        setDrag(null);
        addFiles(Array.from(event.dataTransfer.files));
    };
    const onPaste = (event) => {
        const pasted = Array.from(event.clipboardData.files);
        if (!pasted.length)
            return;
        event.preventDefault();
        addFiles(pasted);
    };
    // Focus first, as a <label> click would: the crop Modal then returns focus to the input (SC 2.4.3).
    const openPicker = () => {
        if (disabled)
            return;
        inputRef.current?.focus();
        inputRef.current?.click();
    };
    return { resolvedAccept, onDragOver, onDragLeave, onDrop, onPaste, openPicker };
}
