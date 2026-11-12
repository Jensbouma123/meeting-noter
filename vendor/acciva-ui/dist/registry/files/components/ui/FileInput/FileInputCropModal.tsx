import type { CropAspect, CropRect } from "@/lib/image/index";
import { Button } from "@/components/ui/Button/index";
import { ImageCropper, type ImageCropperMessages } from "@/components/ui/ImageCropper/index";
import { Modal } from "@/components/ui/Modal/index";
import type { CropSession, FileInputMessages } from "@/components/ui/FileInput/types";

interface FileInputCropModalProps {
  session: CropSession;
  m: FileInputMessages;
  aspectOptions?: readonly CropAspect[];
  label?: string;
  messages?: Partial<ImageCropperMessages>;
  onCancel: () => void;
  onApply: () => Promise<void>;
  onAspectChange: (aspect: CropAspect) => void;
  onLoad: (dims: { width: number; height: number }) => void;
  onRectChange: (rect: CropRect) => void;
  onError: (session: CropSession) => void;
}

export function FileInputCropModal({
  session,
  m,
  aspectOptions,
  label,
  messages,
  onCancel,
  onApply,
  onAspectChange,
  onLoad,
  onRectChange,
  onError,
}: FileInputCropModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      title={m.cropTitle}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            {m.cropCancel}
          </Button>
          <Button onClick={() => void onApply()} disabled={!session.rect}>
            {m.cropApply}
          </Button>
        </>
      }
    >
      <ImageCropper
        source={session.original}
        aspect={session.aspect}
        aspectOptions={aspectOptions}
        label={label}
        messages={messages}
        onAspectChange={onAspectChange}
        onLoad={onLoad}
        onChange={onRectChange}
        onError={() => onError(session)}
      />
    </Modal>
  );
}
