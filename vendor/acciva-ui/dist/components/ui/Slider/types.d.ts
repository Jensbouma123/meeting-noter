export interface SliderRange {
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    onChange: (value: number) => void;
}
