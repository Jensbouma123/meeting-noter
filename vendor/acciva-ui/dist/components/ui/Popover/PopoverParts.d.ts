import type { ReactNode } from "react";
export declare function PopoverHeader({ title, titleId, onClose, }: {
    title: ReactNode;
    titleId: string;
    onClose: () => void;
}): import("react").JSX.Element;
export declare function PopoverBody({ id, hasTitle, children, }: {
    id: string;
    hasTitle: boolean;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function PopoverAction({ label, onAction }: {
    label: string;
    onAction: () => void;
}): import("react").JSX.Element;
