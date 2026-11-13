export type MarkdownBlock =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'paragraph'; text: string };

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };
