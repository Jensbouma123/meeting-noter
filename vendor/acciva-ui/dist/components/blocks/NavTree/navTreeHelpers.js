export function groupDomId(label) {
    return `nav-tree-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
export function groupContainsHref(group, href) {
    if (!href)
        return false;
    return group.items.some((item) => item.href === href || (item.children?.some((child) => child.href === href) ?? false));
}
