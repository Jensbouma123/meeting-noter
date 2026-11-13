/**
 * The bubble's rect only if it is resolved and on screen. Chrome resolves anchor positioning a frame
 * late, so a just-opened bubble reads 0x0 or pinned at the window's top-left (0,0); morphing from
 * that rect flies the new bubble in from the corner. Such a rect means "no previous bubble".
 */
export declare function visibleRect(bubble: HTMLElement): DOMRect | null;
