export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}
export interface SelectProps {
    id?: string;
    options: SelectOption[];
    value: string | null;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    "aria-label"?: string;
    "aria-labelledby"?: string;
}
export declare function Select({ id, options, value, onChange, label, placeholder, disabled, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, }: SelectProps): import("react").JSX.Element;
