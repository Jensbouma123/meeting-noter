import { type RefObject } from "react";
/**
 * Owns the dialog's mount state and its native open/close lifecycle. Returns whether
 * the dialog is mounted; the caller renders nothing while it is not.
 */
export declare function useModalLifecycle(open: boolean, dialogRef: RefObject<HTMLDialogElement | null>): boolean;
