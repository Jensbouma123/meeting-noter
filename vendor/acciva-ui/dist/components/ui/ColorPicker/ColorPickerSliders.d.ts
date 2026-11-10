import { type CSSProperties } from "react";
interface ChannelSliderProps {
    label: string;
    value: number;
    max: number;
    valueText: string;
    trackStyle: CSSProperties;
    thumbColor: string;
    onChange: (value: number) => void;
}
export declare function ChannelSlider({ label, value, max, valueText, trackStyle, thumbColor, onChange }: ChannelSliderProps): import("react").JSX.Element;
export {};
