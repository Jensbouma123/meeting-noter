import { type ReactNode } from "react";
export interface SettingsSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}
export declare function SettingsSheet({ open, onClose, title, children }: SettingsSheetProps): import("react").JSX.Element;
