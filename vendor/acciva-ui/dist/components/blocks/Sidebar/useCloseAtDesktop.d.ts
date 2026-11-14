/**
 * Closes the open mobile drawer once the viewport reaches `lg`. The drawer
 * is a modal `<dialog>` hidden by CSS at `lg`, so leaving it open would strand
 * an invisible modal layer (SC 2.1.2).
 */
export declare function useCloseAtDesktop(open: boolean, onClose: () => void): void;
