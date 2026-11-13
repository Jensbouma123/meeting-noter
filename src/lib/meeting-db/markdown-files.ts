import fs from 'node:fs';
import path from 'node:path';

export function resolveInsideRoot(markdownDir: string, name: string): string | null {
  if (!name || path.isAbsolute(name) || name.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) return null;
  const root = path.resolve(markdownDir);
  const target = path.resolve(root, name);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export function writeMarkdownFile(markdownDir: string, name: string, content: string): void {
  try {
    const target = resolveInsideRoot(markdownDir, name);
    if (!target) return;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, target);
  } catch (err) {
    console.error('[meetings] could not write Markdown file', name, err);
  }
}

export function removeMarkdownFile(markdownDir: string, name: string): void {
  try {
    const target = resolveInsideRoot(markdownDir, name);
    if (target) fs.rmSync(target, { force: true });
  } catch (err) {
    console.error('[meetings] could not remove Markdown file', name, err);
  }
}

export function removeEmptyDirectories(markdownDir: string): void {
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
    }
    if (dir !== markdownDir && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  try {
    walk(markdownDir);
  } catch {
    return;
  }
}
