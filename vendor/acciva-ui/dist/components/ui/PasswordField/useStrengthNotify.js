import { useEffect, useRef } from "react";
export function useStrengthNotify(strength, showStrengthMeter, onStrengthChange) {
    const prevStrengthScoreRef = useRef(strength.score);
    useEffect(() => {
        if (showStrengthMeter && onStrengthChange && prevStrengthScoreRef.current !== strength.score) {
            prevStrengthScoreRef.current = strength.score;
            onStrengthChange(strength);
        }
    }, [strength, showStrengthMeter, onStrengthChange]);
}
