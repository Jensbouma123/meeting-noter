import type { ReactNode } from "react";
import type { SectionHeaderSize } from "./SectionTypes.js";
interface SectionHeaderProps {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    level: 2 | 3 | 4;
    headerSize: SectionHeaderSize;
    headingId?: string;
}
export declare function SectionHeader({ title, description, actions, level, headerSize, headingId, }: SectionHeaderProps): import("react").JSX.Element;
export {};
