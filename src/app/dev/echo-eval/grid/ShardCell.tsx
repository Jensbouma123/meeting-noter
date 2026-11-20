import type { ShardCellProps } from './types';

export function ShardCell({ index, count, src, text }: ShardCellProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded bg-white">
      <header className="flex gap-2 truncate border-b px-2 py-1 font-mono text-xs">
        <a href={src} target="_blank" rel="noreferrer" className="font-semibold">
          shard {index + 1}/{count}
        </a>
        <span className="truncate text-neutral-600">{text ?? 'starting…'}</span>
      </header>
      <iframe title={`echo-eval shard ${index}`} src={src} className="min-h-0 w-full flex-1 border-0" />
    </section>
  );
}
