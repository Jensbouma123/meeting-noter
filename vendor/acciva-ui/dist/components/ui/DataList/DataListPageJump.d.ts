import type { FormEvent } from "react";
interface DataListPageJumpProps {
    id: string;
    currentPage: number;
    totalPages: number;
    value: string;
    onValueChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
}
export declare function DataListPageJump({ id, currentPage, totalPages, value, onValueChange, onSubmit, }: DataListPageJumpProps): import("react").JSX.Element;
export {};
