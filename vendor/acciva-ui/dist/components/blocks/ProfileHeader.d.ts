import type { ReactNode } from "react";
import { type BadgeVariant } from "../../components/ui/Badge.js";
export interface ProfileStat {
    label: string;
    value: string;
}
export interface ProfileBadge {
    label: string;
    variant?: BadgeVariant;
}
export interface ProfileHeaderProps {
    name: string;
    /** Role, handle or location line under the name. */
    subtitle?: string;
    avatarSrc?: string;
    bio?: string;
    badges?: ProfileBadge[];
    /** Up to four label/value counters ("Followers" / "1.2k"). */
    stats?: ProfileStat[];
    /** Action slot (Follow, Message, Edit profile buttons). */
    actions?: ReactNode;
    className?: string;
}
export declare function ProfileHeader({ name, subtitle, avatarSrc, bio, badges, stats, actions, className, }: ProfileHeaderProps): import("react").JSX.Element;
