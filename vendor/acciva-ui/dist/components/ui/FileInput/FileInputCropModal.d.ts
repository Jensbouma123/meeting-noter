import type { CropAspect, CropRect } from "../../../lib/image/index.js";
import { type ImageCropperMessages } from "../ImageCropper/index.js";
import type { CropSession, FileInputMessages } from "./types.js";
interface FileInputCropModalProps {
    session: CropSession;
    m: FileInputMessages;
    aspectOptions?: readonly CropAspect[];
    label?: string;
    messages?: Partial<ImageCropperMessages>;
    onCancel: () => void;
    onApply: () => Promise<void>;
    onAspectChange: (aspect: CropAspect) => void;
    onLoad: (dims: {
        width: number;
        height: number;
    }) => void;
    onRectChange: (rect: CropRect) => void;
    onError: (session: CropSession) => void;
}
export declare function FileInputCropModal({ session, m, aspectOptions, label, messages, onCancel, onApply, onAspectChange, onLoad, onRectChange, onError, }: FileInputCropModalProps): import("react").JSX.Element;
export {};
