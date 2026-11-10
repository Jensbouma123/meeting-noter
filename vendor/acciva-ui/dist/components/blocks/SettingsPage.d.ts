import { type FormEvent, type ReactNode } from "react";
import { SettingsSection } from "./SettingsPage/SettingsPageParts.js";
export { SettingsSection, type SettingsSectionProps } from "./SettingsPage/SettingsPageParts.js";
export interface SettingsPageProps {
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    onSave?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
    onCancel?: () => void;
    isSaving?: boolean;
    saveLabel?: string;
    cancelLabel?: string;
    actions?: ReactNode;
    statusMessage?: {
        type: "success" | "error" | "warning" | "info";
        text: string;
    } | null;
    className?: string;
}
export declare function SettingsPage({ title, description, children, onSave, onCancel, isSaving, saveLabel, cancelLabel, actions, statusMessage, className, }: SettingsPageProps): import("react").JSX.Element;
export declare namespace SettingsPage {
    var Section: typeof SettingsSection;
}
