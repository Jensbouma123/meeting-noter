export declare function isInside(root: string, candidate: string): boolean;
/** Real path of `path`'s deepest existing ancestor (itself when it exists), so a symlink cannot smuggle a write out. */
export declare function realAncestor(path: string): string;
/** The absolute target dir, or a CliError when `--path` leaves the project root (cwd), lexically or via a symlink. */
export declare function resolveTarget(cwd: string, path: string | undefined): string;
