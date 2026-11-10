export declare function useAccordionValue(type: "single" | "multiple", collapsible: boolean, controlledValue: string | string[] | undefined, defaultValue: string | string[] | undefined, onValueChange: ((value: string | string[]) => void) | undefined): {
    expandedValues: Set<string>;
    toggleValue: (itemValue: string) => void;
};
