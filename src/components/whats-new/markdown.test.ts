import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('markdown', () => {
  it('parses headings, lists, code and paragraphs', () => {
    expect(parseMarkdown('## Hi\n- a\n- b\n\ntext\nmore\n```\nx\n```')).toEqual([
      { kind: 'heading', level: 3, text: 'Hi' },
      { kind: 'list', items: ['a', 'b'] },
      { kind: 'paragraph', text: 'text more' },
      { kind: 'code', text: 'x' },
    ]);
  });

  it('only links http(s) and leaves raw html as text', () => {
    expect(parseInline('<img src=x onerror=a> [x](javascript:alert(1)) [ok](https://a.test)').map((t) => t.kind)).toEqual(['text', 'link']);
  });
});
