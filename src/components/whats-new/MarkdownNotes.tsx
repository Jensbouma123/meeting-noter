import { createElement } from 'react';
import { parseInline, parseMarkdown } from './markdown';

function Inline({ text }: { text: string }) {
  return parseInline(text).map((token, i) => {
    if (token.kind === 'strong') return <strong key={i}>{token.text}</strong>;
    if (token.kind === 'code') return <code key={i} className="rounded bg-muted px-1 text-[0.9em]">{token.text}</code>;
    if (token.kind === 'link') return <a key={i} href={token.href} target="_blank" rel="noopener noreferrer" className="underline">{token.text}</a>;
    return token.text;
  });
}

export function MarkdownNotes({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {parseMarkdown(source).map((block, i) => {
        if (block.kind === 'heading') return createElement(`h${block.level}`, { key: i, className: 'mt-2 font-semibold' }, <Inline text={block.text} />);
        if (block.kind === 'list') return <ul key={i} className="list-disc pl-5">{block.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}</ul>;
        if (block.kind === 'code') return <pre key={i} className="overflow-x-auto rounded bg-muted p-2 text-xs"><code>{block.text}</code></pre>;
        return <p key={i}><Inline text={block.text} /></p>;
      })}
    </div>
  );
}
