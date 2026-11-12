import { ImageProcessError, cropImage, initialCropRect, type CropAspect, type CropRect } from "@/lib/image/index";
import type { CropSession, FileInputConfig } from "@/components/ui/FileInput/types";
import type { useFileInputPipeline } from "@/components/ui/FileInput/useFileInputPipeline";
import type { FileInputState } from "@/components/ui/FileInput/useFileInputState";

type Pipeline = Pick<ReturnType<typeof useFileInputPipeline>, "reject" | "finish">;

export function useFileInputCrop(state: FileInputState, c: FileInputConfig, { reject, finish }: Pipeline) {
  const { files, cropSession, commit, setRejections, setAnnouncement, setProcessing, setCropSession, abortRef, originals } =
    state;
  const { m, maxSize, multiple, compressOptions, cropAspect } = c;

  const cancelCrop = () => {
    setCropSession(null);
    setAnnouncement(m.cropCancelled);
  };

  const applyCrop = async () => {
    const session = cropSession;
    if (!session?.rect) return;
    setCropSession(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    setAnnouncement(m.processing(1));
    const rejected = session.rejected ?? [];
    let result: File;
    try {
      result = await cropImage(session.original, session.rect, compressOptions, { signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (!(err instanceof ImageProcessError)) throw err;
      finish(files, [], [...rejected, reject(session.original, "process")], []);
      return;
    }
    if (controller.signal.aborted) return;
    const target = session.target;
    if (target) {
      // Re-crop: swap the entry in place, keep tracking the untouched original.
      if (maxSize !== undefined && result.size > maxSize) {
        finish(files, [], [reject(session.original, "max-size")], []);
        return;
      }
      originals.current.set(result, session.original);
      originals.current.delete(target);
      setProcessing(false);
      setRejections([]);
      commit(
        files.map((f) => (f === target ? result : f)),
        { added: [result], removed: [target], rejected: [], cropped: result },
      );
      setAnnouncement(m.added([result]));
      return;
    }
    const base = session.base ?? [];
    finish(base, [[session.original, result]], rejected, multiple ? [] : [...files], result);
  };

  const openRecrop = (file: File) =>
    setCropSession({ original: originals.current.get(file) ?? file, target: file, aspect: cropAspect });

  // The cropper could not decode the source: close it and reject the original.
  const cropError = (session: CropSession) => {
    setCropSession(null);
    finish(files, [], [...(session.rejected ?? []), reject(session.original, "process")], []);
  };

  const onAspectChange = (aspect: CropAspect) =>
    setCropSession((s) => s && { ...s, aspect, rect: s.dims ? initialCropRect(s.dims.width, s.dims.height, aspect) : s.rect });
  const onLoad = (dims: { width: number; height: number }) =>
    setCropSession((s) => s && { ...s, dims, rect: initialCropRect(dims.width, dims.height, s.aspect) });
  const onRectChange = (rect: CropRect) => setCropSession((s) => s && { ...s, rect });

  return { cancelCrop, applyCrop, openRecrop, cropError, onAspectChange, onLoad, onRectChange };
}
