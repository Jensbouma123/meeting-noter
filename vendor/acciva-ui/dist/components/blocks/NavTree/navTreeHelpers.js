export function groupContainsHref(group, href) {
    if (!href)
        return false;
    return group.items.some((item) => item.href === href || (item.children?.some((child) => child.href === href) ?? false));
}
