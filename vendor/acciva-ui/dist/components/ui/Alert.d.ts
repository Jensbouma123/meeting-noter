import { type HTMLAttributes, type ReactNode } from "react";
import { type SemanticVariant } from "../../components/ui/variant-tokens.js";
export type AlertVariant = SemanticVariant;
export type AlertLiveRole = "alert" | "status";
export type AlertLayout = "card" | "banner" | "inline";
export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    variant?: AlertVariant;
    layout?: AlertLayout;
    title?: ReactNode;
    children?: ReactNode;
    icon?: ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
    action?: ReactNode;
    role?: AlertLiveRole;
}
export declare const Alert: import("react").ForwardRefExoticComponent<AlertProps & import("react").RefAttributes<HTMLDivElement>>;
