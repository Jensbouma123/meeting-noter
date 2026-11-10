import { type RGBA } from "../../../lib/color/formats/index.js";
interface ChannelInputProps {
    label: string;
    accessibleName: string;
    committed: string;
    parse: (text: string) => number | null;
    onCommit: (value: number) => void;
}
export declare function integerIn(max: number): (text: string) => number | null;
export declare function ChannelInput({ label, accessibleName, committed, parse, onCommit }: ChannelInputProps): import("react").JSX.Element;
export declare function HexInput({ committed, onCommit }: {
    committed: string;
    onCommit: (rgba: RGBA) => void;
}): import("react").JSX.Element;
export {};
