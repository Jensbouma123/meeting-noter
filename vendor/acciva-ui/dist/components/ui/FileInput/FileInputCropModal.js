import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../Button/index.js";
import { ImageCropper } from "../ImageCropper/index.js";
import { Modal } from "../Modal/index.js";
export function FileInputCropModal({ session, m, aspectOptions, label, messages, onCancel, onApply, onAspectChange, onLoad, onRectChange, onError, }) {
    return (_jsx(Modal, { open: true, onClose: onCancel, title: m.cropTitle, size: "lg", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: onCancel, children: m.cropCancel }), _jsx(Button, { onClick: () => void onApply(), disabled: !session.rect, children: m.cropApply })] }), children: _jsx(ImageCropper, { source: session.original, aspect: session.aspect, aspectOptions: aspectOptions, label: label, messages: messages, onAspectChange: onAspectChange, onLoad: onLoad, onChange: onRectChange, onError: () => onError(session) }) }));
}
