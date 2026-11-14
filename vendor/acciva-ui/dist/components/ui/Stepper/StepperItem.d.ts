export type StepState = "completed" | "current" | "upcoming";
export declare function stateOf(index: number, current: number): StepState;
interface StepperItemProps {
    label: string;
    index: number;
    state: StepState;
    variant: "dots" | "chips";
    /** Set when the step is requestable: renders a real button instead of static content. */
    onRequest?: () => void;
}
export declare function StepperItem({ label, index, state, variant, onRequest }: StepperItemProps): import("react").JSX.Element;
export {};
