import type { MouseEvent as ReactMouseEvent } from "react";
export declare const supportsClosedBy: () => boolean;
/** Dismisses when a click lands on the dialog element itself but outside its box (the ::backdrop). */
export declare function dismissOnOutsideClick(event: ReactMouseEvent<HTMLDialogElement>, onDismiss: () => void): void;
