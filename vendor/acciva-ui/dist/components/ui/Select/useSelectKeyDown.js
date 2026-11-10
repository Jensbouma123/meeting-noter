import { firstEnabledIndex } from "./navigation.js";
import { useTypeahead } from "./useTypeahead.js";
export function useSelectKeyDown(options, disabled, open, activeIndex, setActiveIndex, setOpen, openList, commit, onChange) {
    const handleTypeahead = useTypeahead(options, open, onChange, setActiveIndex);
    const moveActive = (delta) => {
        setActiveIndex((prev) => {
            const wrapped = ((prev + delta) % options.length + options.length) % options.length;
            const next = firstEnabledIndex(options, wrapped, delta);
            return next === -1 ? prev : next;
        });
    };
    const jumpTo = (edge) => {
        const next = edge === "first" ? firstEnabledIndex(options, 0, 1) : firstEnabledIndex(options, options.length - 1, -1);
        if (next !== -1)
            setActiveIndex(next);
    };
    return (event) => {
        if (disabled)
            return;
        if (!open) {
            switch (event.key) {
                case "ArrowDown":
                case "ArrowUp":
                case "Enter":
                case " ":
                    event.preventDefault();
                    openList();
                    return;
                case "PageUp":
                case "PageDown":
                    event.preventDefault();
                    return;
                default:
                    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                        event.preventDefault();
                        handleTypeahead(event.key);
                    }
                    return;
            }
        }
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveActive(-1);
                break;
            case "PageUp":
                event.preventDefault();
                jumpTo("first");
                break;
            case "PageDown":
                event.preventDefault();
                jumpTo("last");
                break;
            case "Home":
                event.preventDefault();
                jumpTo("first");
                break;
            case "End":
                event.preventDefault();
                jumpTo("last");
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                commit(activeIndex);
                break;
            case "Escape":
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                break;
            case "Tab":
                setOpen(false);
                break;
            default:
                if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    handleTypeahead(event.key);
                }
        }
    };
}
