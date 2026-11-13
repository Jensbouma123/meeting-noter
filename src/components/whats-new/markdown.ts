import type { InlineToken, MarkdownBlock } from './markdown.types';

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const LIST_ITEM = /^\s*[-*+]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    if (items.length) blocks.push({ kind: 'list', items });
    paragraph = [];
    items = [];
  };
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('```')) {
      flush();
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trimStart().startsWith('```')) code.push(lines[i]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    const item = LIST_ITEM.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: Math.min(4, Math.max(2, heading[1].length + 1)) as 2 | 3 | 4, text: heading[2] });
    } else if (item) {
      if (paragraph.length) flush();
      items.push(item[1]);
    } else if (!line.trim()) flush();
    else {
      if (items.length) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) tokens.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ kind: 'strong', text: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: 'code', text: m[2] });
    else tokens.push({ kind: 'link', text: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return tokens;
}
