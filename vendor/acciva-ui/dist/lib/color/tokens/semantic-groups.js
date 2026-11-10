function roleToToken(semanticRole) {
    return {
        $value: semanticRole.$value,
        $type: "color",
        $description: semanticRole.$description,
    };
}
export function rolesToGroup(roles) {
    const group = {};
    for (const [groupName, members] of Object.entries(roles)) {
        const entries = {};
        for (const [roleName, semanticRole] of Object.entries(members)) {
            entries[roleName] = roleToToken(semanticRole);
        }
        group[groupName] = entries;
    }
    return group;
}
