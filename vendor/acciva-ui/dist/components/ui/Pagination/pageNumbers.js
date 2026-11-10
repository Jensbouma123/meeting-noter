export function getPageNumbers(totalPages, current, siblingCount) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    const left = Math.max(2, current - siblingCount);
    const right = Math.min(totalPages - 1, current + siblingCount);
    pages.push(1);
    if (left > 2) {
        pages.push("ellipsis");
    }
    for (let i = left; i <= right; i++) {
        pages.push(i);
    }
    if (right < totalPages - 1) {
        pages.push("ellipsis");
    }
    pages.push(totalPages);
    return pages;
}
