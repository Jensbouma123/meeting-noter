export interface ArrowHintProps {
    id: string;
    text: string | null;
    visible: boolean;
    className?: string;
}
/**
 * Visual caption for `useArrowHint`. Absolute, so it never shifts layout; the
 * parent must be `relative`. aria-hidden: the same text reaches assistive tech
 * through aria-describedby on the group while visible.
 */
export declare function ArrowHint({ id, text, visible, className }: ArrowHintProps): import("react").JSX.Element | null;
