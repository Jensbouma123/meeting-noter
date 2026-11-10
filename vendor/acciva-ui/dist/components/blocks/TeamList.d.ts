export interface TeamMember {
    id: string;
    name: string;
    role: string;
    email?: string;
    src?: string;
}
export interface TeamListProps {
    members: readonly TeamMember[];
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    inviteLabel?: string;
    onInvite?: () => void;
    onRemove?: (id: string) => void;
    removeLabel?: (name: string) => string;
    className?: string;
}
export declare function TeamList({ members, title, emptyTitle, emptyDescription, inviteLabel, onInvite, onRemove, removeLabel, className, }: TeamListProps): import("react").JSX.Element;
