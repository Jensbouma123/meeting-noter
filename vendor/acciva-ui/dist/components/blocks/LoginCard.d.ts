import { type SocialProvider } from "../../components/ui/SocialButton.js";
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface LoginCardProps {
    title?: string;
    description?: string;
    /** Called with the submitted credentials; the block never talks to a backend. */
    onSubmit: (credentials: LoginCredentials) => void;
    /** Providers rendered as social sign-in buttons above the form. */
    providers?: SocialProvider[];
    onProviderClick?: (provider: SocialProvider) => void;
    /** Form-level failure ("Wrong email or password"), announced as an alert. */
    error?: string;
    /** Disables the submit button and shows its spinner while a request is in flight. */
    loading?: boolean;
    submitLabel?: string;
    /** Slot below the form, e.g. a "Create account" link. */
    footer?: React.ReactNode;
    className?: string;
}
export declare function LoginCard({ title, description, onSubmit, providers, onProviderClick, error, loading, submitLabel, footer, className, }: LoginCardProps): import("react").JSX.Element;
