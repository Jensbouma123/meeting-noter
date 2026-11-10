import { type FormEvent } from "react";
export declare function usePageJump(totalPages: number, onPageChange: (page: number) => void): readonly [string, import("react").Dispatch<import("react").SetStateAction<string>>, (e: FormEvent) => void];
