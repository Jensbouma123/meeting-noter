export function firstEnabledIndex(options, from, delta) {
    if (options.length === 0)
        return -1;
    let index = from;
    for (let i = 0; i < options.length; i++) {
        if (index >= 0 && index < options.length && !options[index].disabled)
            return index;
        index += delta;
        if (index < 0)
            index = options.length - 1;
        if (index >= options.length)
            index = 0;
    }
    return -1;
}
