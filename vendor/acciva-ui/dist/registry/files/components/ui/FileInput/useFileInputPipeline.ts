import type { ChangeEvent } from "react";
import { ImageProcessError, compressImage, formatBytes, isCroppable, matchesAccept } from "@/lib/image/index";
import { plural } from "@/components/ui/FileInput/constants";
import type { FileInputConfig, FileRejection, FileRejectionReason } from "@/components/ui/FileInput/types";
import type { FileInputState } from "@/components/ui/FileInput/useFileInputState";

export function useFileInputPipeline(state: FileInputState, c: FileInputConfig) {
  const {
    files,
    cropSession,
    commit,
    setRejections,
    setAnnouncement,
    setProcessing,
    setCropSession,
    abortRef,
    originals,
    focusAfterRemove,
    syncNative,
  } = state;
  const { m, maxSize, minSize, maxFiles, accept, multiple, disabled, cropConfig, cropAspect, compressOptions, onReject } = c;

  const reject = (file: File, reason: FileRejectionReason): FileRejection => {
    const text =
      reason === "type"
        ? m.type
        : reason === "max-size"
          ? m.maxSize(formatBytes(maxSize ?? 0))
          : reason === "min-size"
            ? m.minSize(formatBytes(minSize ?? 0))
            : reason === "count"
              ? m.count(maxFiles)
              : m.process;
    const r: FileRejection = { file, reason, message: `${file.name} ${text}` };
    return { ...r, message: m.rejected(r) };
  };

  const finish = (
    base: readonly File[],
    pairs: [original: File, result: File][],
    rejected: FileRejection[],
    removed: File[],
    cropped?: File,
  ) => {
    const added: File[] = [];
    for (const [original, result] of pairs) {
      if (maxSize !== undefined && result.size > maxSize) {
        rejected.push(reject(original, "max-size"));
        continue;
      }
      if (result !== original) originals.current.set(result, original);
      added.push(result);
    }
    setProcessing(false);
    setRejections(rejected);
    if (rejected.length) onReject?.(rejected);
    if (added.length) commit([...base, ...added], { added, removed, rejected, cropped });
    setAnnouncement(
      [added.length ? m.added(added) : "", ...rejected.map((r) => r.message)].filter(Boolean).join(". "),
    );
  };

  const runCompress = async (base: readonly File[], accepted: File[], rejected: FileRejection[], removed: File[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const pairs: [File, File][] = [];
    if (compressOptions) {
      setProcessing(true);
      setAnnouncement(m.processing(accepted.length));
    }
    for (const f of accepted) {
      try {
        pairs.push([f, compressOptions ? await compressImage(f, compressOptions, { signal: controller.signal }) : f]);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ImageProcessError) rejected.push(reject(f, "process"));
        else throw err;
      }
    }
    if (controller.signal.aborted) return;
    finish(base, pairs, rejected, removed);
  };

  const addFiles = (incoming: File[]) => {
    if (disabled || incoming.length === 0 || cropSession) return;
    const batch = multiple ? incoming : incoming.slice(0, 1);
    const base = multiple ? files : [];
    const removed = multiple ? [] : [...files];
    const capacity = maxFiles - base.length;
    const rejected: FileRejection[] = [];
    const accepted: File[] = [];
    for (const f of batch) {
      if (!matchesAccept(f, accept)) rejected.push(reject(f, "type"));
      else if (minSize !== undefined && f.size < minSize) rejected.push(reject(f, "min-size"));
      else if (accepted.length >= capacity) rejected.push(reject(f, "count"));
      else accepted.push(f);
    }
    if (cropConfig && cropConfig.auto !== false && accepted.length === 1 && isCroppable(accepted[0])) {
      setCropSession({ original: accepted[0], base: [...base], rejected, aspect: cropAspect });
      return;
    }
    if (accepted.length === 0) {
      finish(base, [], rejected, []);
      return;
    }
    void runCompress(base, accepted, rejected, removed);
  };

  const removeAt = (index: number) => {
    const file = files[index];
    const next = files.filter((_, i) => i !== index);
    originals.current.delete(file);
    focusAfterRemove.current = index;
    setRejections([]);
    commit(next, { added: [], removed: [file], rejected: [] });
    setAnnouncement(m.removed(file.name));
  };

  const clearAll = () => {
    focusAfterRemove.current = -1;
    setRejections([]);
    commit([], { added: [], removed: [...files], rejected: [] });
    setAnnouncement(m.removed(plural(files.length)));
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    // Reset to the committed list: a rejected or cancelled pick never reaches a form, and
    // picking the same file again still fires `change`. A commit re-syncs via the effect.
    syncNative(files);
    addFiles(picked);
  };

  return { reject, finish, addFiles, removeAt, clearAll, onInputChange };
}
