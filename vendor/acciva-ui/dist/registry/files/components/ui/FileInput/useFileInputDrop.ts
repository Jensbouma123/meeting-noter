import type { ClipboardEvent, DragEvent } from "react";
import { matchesAccept, resolveAccept } from "@/lib/image/index";
import type { FileInputConfig } from "@/components/ui/FileInput/types";
import type { FileInputState } from "@/components/ui/FileInput/useFileInputState";

export function useFileInputDrop(state: FileInputState, c: FileInputConfig, addFiles: (incoming: File[]) => void) {
  const { inputRef, setDrag } = state;
  const { accept, disabled } = c;

  const resolvedAccept = resolveAccept(accept);
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    // MIME types are visible during the drag; extension tokens are not, so only judge pure-MIME lists.
    const types = Array.from(event.dataTransfer.items ?? [], (item) => item.type);
    const judgeable = resolvedAccept && !resolvedAccept.includes(".") && types.length > 0 && types.every(Boolean);
    const ok = !judgeable || types.some((type) => matchesAccept({ name: "", type }, accept));
    setDrag(ok ? "accept" : "reject");
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag(null);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDrag(null);
    addFiles(Array.from(event.dataTransfer.files));
  };
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pasted = Array.from(event.clipboardData.files);
    if (!pasted.length) return;
    event.preventDefault();
    addFiles(pasted);
  };
  // Focus first, as a <label> click would: the crop Modal then returns focus to the input (SC 2.4.3).
  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.focus();
    inputRef.current?.click();
  };

  return { resolvedAccept, onDragOver, onDragLeave, onDrop, onPaste, openPicker };
}
