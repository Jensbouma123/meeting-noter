import { useEffect, useRef } from "react";
const TYPEAHEAD_RESET_MS = 500;
export function useTypeahead(options, open, onChange, setActiveIndex) {
    const typeaheadRef = useRef("");
    const typeaheadTimer = useRef(null);
    useEffect(() => () => {
        if (typeaheadTimer.current)
            clearTimeout(typeaheadTimer.current);
    }, []);
    return (key) => {
        if (typeaheadTimer.current)
            clearTimeout(typeaheadTimer.current);
        typeaheadRef.current += key.toLowerCase();
        typeaheadTimer.current = setTimeout(() => {
            typeaheadRef.current = "";
        }, TYPEAHEAD_RESET_MS);
        const query = typeaheadRef.current;
        const match = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(query));
        if (match === -1)
            return;
        setActiveIndex(match);
        if (!open)
            onChange(options[match].value);
    };
}
