import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
export declare function BadgeDot({ className }: {
    className: string;
}): import("react").JSX.Element;
export declare function BadgeDismiss({ label, size, disabled, onDismiss, }: {
    label: string;
    size: ResponsiveSize<SizeTier>;
    disabled: boolean;
    onDismiss: () => void;
}): import("react").JSX.Element;
