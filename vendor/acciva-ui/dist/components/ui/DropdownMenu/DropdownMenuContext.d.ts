export interface DropdownMenuContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    contentId: string;
    triggerId: string;
    /** Dashed ident linking the trigger (`anchor-name`) to the menu (`position-anchor`). */
    anchorName: string;
    /** Open state at the trigger's last pointerdown: a light dismiss closes the menu before `click` fires. */
    openAtPointerDownRef: React.MutableRefObject<boolean | null>;
    /** Set by the trigger on ArrowUp so the opened menu focuses its last item. */
    openLastRef: React.MutableRefObject<boolean>;
}
export declare const DropdownMenuContext: import("react").Context<DropdownMenuContextValue | null>;
export declare function useDropdownMenuContext(component: string): DropdownMenuContextValue;
