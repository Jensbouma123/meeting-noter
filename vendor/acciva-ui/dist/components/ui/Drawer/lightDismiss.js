// Evaluated per render, never at module scope: the server has no HTMLDialogElement.
export const supportsClosedBy = () => typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;
/** Dismisses when a click lands on the dialog element itself but outside its box (the ::backdrop). */
export function dismissOnOutsideClick(event, onDismiss) {
    if (event.target !== event.currentTarget)
        return;
    const { top, left, right, bottom } = event.currentTarget.getBoundingClientRect();
    if (event.clientY < top || event.clientY > bottom || event.clientX < left || event.clientX > right) {
        onDismiss();
    }
}
