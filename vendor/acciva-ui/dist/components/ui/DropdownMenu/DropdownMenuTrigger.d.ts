import { type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
export interface DropdownMenuTriggerProps {
    children: ReactElement<{
        ref?: React.Ref<HTMLElement>;
        onClick?: (e: React.MouseEvent) => void;
        onKeyDown?: (e: KeyboardEvent) => void;
        onPointerDown?: (e: React.PointerEvent) => void;
        style?: CSSProperties;
    }>;
}
export declare function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps): import("react").JSX.Element;
