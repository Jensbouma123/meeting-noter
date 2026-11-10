import { clampValue } from "./sliderMath.js";
export function useSliderKeys({ value, min, max, step, disabled, onChange }) {
    return (event) => {
        if (disabled)
            return;
        const big = (max - min) / 10 || step;
        const actions = {
            ArrowRight: value + step,
            ArrowUp: value + step,
            ArrowLeft: value - step,
            ArrowDown: value - step,
            PageUp: value + big,
            PageDown: value - big,
            Home: min,
            End: max,
        };
        if (event.key in actions) {
            event.preventDefault();
            onChange(clampValue(actions[event.key], min, max));
        }
    };
}
