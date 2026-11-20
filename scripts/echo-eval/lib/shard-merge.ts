import fs from 'node:fs';

const rows = (file: string): { id: string; line: string }[] =>
  fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => ({ id: (JSON.parse(line) as { id: string }).id, line }))
    : [];

export function mergeShardResults(target: string, sources: string[]): number {
  const byId = new Map<string, string>();
  for (const file of [target, ...sources]) for (const r of rows(file)) byId.set(r.id, r.line);
  fs.writeFileSync(target, byId.size ? `${[...byId.values()].join('\n')}\n` : '');
  return byId.size;
}
