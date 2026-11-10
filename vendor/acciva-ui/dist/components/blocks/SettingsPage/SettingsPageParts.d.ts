import { type ReactNode } from "react";
import { type CardVariant } from "../../ui/Card/index.js";
export interface SettingsSectionProps {
    id?: string;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    actions?: ReactNode;
    variant?: CardVariant;
    className?: string;
}
export declare function SettingsSection({ id, title, description, children, actions, variant, className, }: SettingsSectionProps): import("react").JSX.Element;
